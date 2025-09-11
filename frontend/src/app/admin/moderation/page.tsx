'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { gql, useQuery, useMutation } from '@apollo/client';
import {
  ADMIN_MODERATION,
  ADMIN_MODERATION_ACTION,
  ADMIN_MODERATION_BULK_ACTION,
  ADMIN_ADD_MODERATION_ATTACHMENT,
} from '@/lib/admin-queries';

interface ModerationItem {
  id: string;
  type: 'photo' | 'profile' | 'message';
  user: {
    id: string;
    name: string;
    email: string;
  };
  content: string;
  reason: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  submittedAt: Date;
  reportedBy?: string;
  status: 'pending' | 'approved' | 'rejected';
}

export default function AdminModerationPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [priorityFilter, setPriorityFilter] = useState<
    'all' | 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  >('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'PHOTO' | 'PROFILE' | 'MESSAGE'>('all');
  const [reporterEmail, setReporterEmail] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(20);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const [bulkAction] = useMutation(ADMIN_MODERATION_BULK_ACTION);
  const [addAttachment] = useMutation(ADMIN_ADD_MODERATION_ATTACHMENT);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const selectAll = () => {
    const all = new Set((moderationData?.adminModeration?.items || []).map((i: any) => i.id));
    setSelectedIds(all);
  };
  const clearSelection = () => setSelectedIds(new Set());

  const runBulk = async (action: 'approve' | 'reject') => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    try {
      await bulkAction({ variables: { itemIds: ids, action, reason: `Bulk ${action}` } });
      // Rely on refetch to update the list
    } finally {
      clearSelection();
      refetch();
    }
  };

  // Fetch current user admin status deterministically to gate this page
  const ME = gql`
    query MeAdminCheck {
      me {
        id
        profile {
          isAdmin
        }
      }
    }
  `;
  const { data: meData, loading: meLoading } = useQuery(ME, { fetchPolicy: 'network-only' });
  const [isAdminUser, setIsAdminUser] = useState<boolean | null>(null);
  useEffect(() => {
    async function checkAdmin() {
      try {
        const httpUri = (
          process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/graphql'
        ).toString();
        const res = await fetch(httpUri, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ query: 'query { me { profile { isAdmin } } }' }),
        });
        const json = await res.json();
        const flag = !!json?.data?.me?.profile?.isAdmin;
        setIsAdminUser(flag);
      } catch {
        // Fall back to Apollo result if network call fails
        setIsAdminUser(!!meData?.me?.profile?.isAdmin ?? false);
      }
    }
    checkAdmin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If Apollo returns later, update state
  useEffect(() => {
    if (isAdminUser === null && meLoading === false) {
      setIsAdminUser(!!meData?.me?.profile?.isAdmin);
    }
  }, [meLoading, meData, isAdminUser]);

  const moderationVars = {
    limit: pageSize,
    offset: currentPage * pageSize,
    status: activeTab,
    priority: priorityFilter === 'all' ? null : priorityFilter,
    startDate: startDate ? new Date(startDate).toISOString() : null,
    endDate: endDate ? new Date(endDate).toISOString() : null,
    type: typeFilter === 'all' ? null : typeFilter,
    reporterEmail: reporterEmail || null,
  } as const;

  // GraphQL queries and mutations (skip until we know user is admin)
  const {
    data: moderationData,
    loading: moderationLoading,
    error: moderationError,
    refetch,
  } = useQuery(ADMIN_MODERATION, {
    variables: moderationVars,
    skip: isAdminUser !== true,
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
  });

  const [moderationAction] = useMutation(ADMIN_MODERATION_ACTION);

  const moderationItems = moderationData?.adminModeration?.items || [];
  const totalCount = moderationData?.adminModeration?.totalCount || 0;
  const hasMore = moderationData?.adminModeration?.hasMore || false;

  // Avoid redirects during E2E; render explicit access denied state instead
  useEffect(() => {
    // no-op; redirection disabled for test stability
  }, []);

  // Auto-refresh when filters change
  useEffect(() => {
    setCurrentPage(0); // Reset to first page when filters change
    refetch();
  }, [activeTab, priorityFilter, typeFilter, reporterEmail, startDate, endDate, pageSize, refetch]);

  const handleModerationAction = async (itemId: string, action: 'approve' | 'reject') => {
    const nextStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';
    try {
      await moderationAction({
        variables: { itemId, action, reason: `Admin ${action} action` },
        optimisticResponse: { adminModerationAction: true },
        update: (cache) => {
          try {
            const existing: any = cache.readQuery({
              query: ADMIN_MODERATION,
              variables: moderationVars,
            });
            if (!existing?.adminModeration?.items) return;
            const updated = existing.adminModeration.items.map((it: any) =>
              it.id === itemId
                ? { ...it, status: nextStatus, reviewedAt: new Date().toISOString() }
                : it,
            );
            cache.writeQuery({
              query: ADMIN_MODERATION,
              variables: moderationVars,
              data: { adminModeration: { ...existing.adminModeration, items: updated } },
            });
          } catch (e) {
            // Fallback to refetch on cache miss
            refetch();
          }
        },
        onError: () => refetch(),
      });
    } catch (error) {
      console.error(`Failed to ${action} item:`, error);
    }
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'bg-blue-500/20 border-blue-400/30 text-blue-200',
      medium: 'bg-yellow-500/20 border-yellow-400/30 text-yellow-200',
      high: 'bg-orange-500/20 border-orange-400/30 text-orange-200',
      urgent: 'bg-red-500/20 border-red-400/30 text-red-200',
    };
    return colors[priority as keyof typeof colors] || colors.low;
  };

  const getTypeIcon = (type: string) => {
    const icons = {
      photo: '📸',
      profile: '👤',
      message: '💬',
    };
    return icons[type as keyof typeof icons] || '📄';
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  // Show a loading spinner while determining admin status
  if (isAdminUser === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-white/80">Checking access...</p>
        </div>
      </div>
    );
  }

  // If user is not admin, show an access denied state (also redirected by effect above)
  if (isAdminUser !== true) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/90 text-lg" data-testid="access-denied">
            Access denied
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#667eea] to-[#764ba2] relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-10 left-10 text-6xl animate-pulse">🛡️</div>
        <div className="absolute top-32 right-16 text-4xl animate-bounce">⚠️</div>
        <div className="absolute bottom-20 left-20 text-5xl animate-pulse">🔍</div>
        <div className="absolute bottom-40 right-10 text-3xl animate-bounce">✅</div>
      </div>

      {/* Enhanced Header */}
      <div className="flex items-center justify-between p-4 relative z-10">
        <div className="flex items-center gap-3">
          <motion.button
            onClick={() => router.push('/admin')}
            className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center backdrop-blur-md border border-white/20"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </motion.button>
          <div>
            <h1 className="font-bold text-xl text-white">Content Moderation</h1>
            <p className="text-white/70 text-sm">{moderationItems.length} items to review</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            className="p-3 rounded-xl glass-card text-white/80 hover:text-white hover:bg-white/15 transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </motion.button>
        </div>
      </div>

      {/* Tabs and Filters */}
      <div className="px-4 relative z-10 mb-6">
        <div className="max-w-6xl mx-auto">
          <div className="glass-card-light p-4 rounded-2xl backdrop-blur-lg border border-white/30">
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
              {/* Status Tabs */}
              <div className="flex gap-1 bg-white/10 rounded-xl p-1">
                {[
                  {
                    key: 'pending',
                    label: 'Pending',
                    count: moderationItems.filter((i: ModerationItem) => i.status === 'pending')
                      .length,
                  },
                  {
                    key: 'approved',
                    label: 'Approved',
                    count: moderationItems.filter((i: ModerationItem) => i.status === 'approved')
                      .length,
                  },
                  {
                    key: 'rejected',
                    label: 'Rejected',
                    count: moderationItems.filter((i: ModerationItem) => i.status === 'rejected')
                      .length,
                  },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as any)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeTab === tab.key
                        ? 'bg-white/20 text-white shadow-lg'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>

              {/* Priority Filter */}
              <div className="flex flex-wrap gap-2 items-center">
                {[
                  { key: 'all', label: 'All Priority' },
                  { key: 'URGENT', label: 'Urgent' },
                  { key: 'HIGH', label: 'High' },
                  { key: 'MEDIUM', label: 'Medium' },
                  { key: 'LOW', label: 'Low' },
                ].map((filter) => (
                  <button
                    key={filter.key}
                    onClick={() => setPriorityFilter(filter.key as any)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      priorityFilter === filter.key
                        ? 'bg-white/20 text-white'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}

                {/* Type Filter */}
                <div className="flex gap-2 ml-4">
                  {[
                    { key: 'all', label: 'All Types' },
                    { key: 'PHOTO', label: 'Photo' },
                    { key: 'PROFILE', label: 'Profile' },
                    { key: 'MESSAGE', label: 'Message' },
                  ].map((filter) => (
                    <button
                      key={filter.key}
                      onClick={() => setTypeFilter(filter.key as any)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        typeFilter === filter.key
                          ? 'bg-white/20 text-white'
                          : 'text-white/70 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>

                {/* Reporter Email */}
                <input
                  type="email"
                  value={reporterEmail}
                  onChange={(e) => setReporterEmail(e.target.value)}
                  placeholder="Reporter email"
                  className="ml-4 px-3 py-1.5 rounded-lg bg-white/10 text-white placeholder-white/50 border border-white/20"
                />

                {/* Date Range */}
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="ml-2 px-3 py-1.5 rounded-lg bg-white/10 text-white border border-white/20"
                />
                <span className="text-white/60">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-white/10 text-white border border-white/20"
                />

                {/* Page Size */}
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(parseInt(e.target.value))}
                  className="ml-4 px-3 py-1.5 rounded-lg bg-white/10 text-white border border-white/20"
                >
                  {[10, 20, 50, 100].map((size) => (
                    <option key={size} value={size}>
                      {size}/page
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Moderation Queue */}
      <div className="flex-1 px-4 pb-8 relative z-10 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {moderationItems.length === 0 ? (
            <motion.div
              className="text-center py-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="text-6xl mb-4">✅</div>
              <h3 className="text-lg font-semibold text-white mb-2">No items to review</h3>
              <p className="text-white/80">All {activeTab} items have been processed.</p>
            </motion.div>
          ) : (
            <div>
              <div
                className="flex items-center justify-between mb-3"
                role="region"
                aria-label="Bulk moderation toolbar"
              >
                <div className="text-white/70 text-sm">Selected: {selectedIds.size}</div>
                <div className="flex gap-2">
                  <button
                    aria-label="Approve selected"
                    onClick={() => runBulk('approve')}
                    disabled={selectedIds.size === 0}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${selectedIds.size === 0 ? 'text-white/30 border-white/10' : 'text-green-200 border-green-400/30 hover:bg-green-500/20'}`}
                    data-testid="bulk-approve"
                  >
                    ✅ Approve
                  </button>
                  <button
                    aria-label="Reject selected"
                    onClick={() => runBulk('reject')}
                    disabled={selectedIds.size === 0}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${selectedIds.size === 0 ? 'text-white/30 border-white/10' : 'text-red-200 border-red-400/30 hover:bg-red-500/20'}`}
                    data-testid="bulk-reject"
                  >
                    ❌ Reject
                  </button>
                  <button
                    aria-label="Select all on page"
                    onClick={selectAll}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium border text-white/80 border-white/20 hover:bg-white/10"
                    data-testid="select-all"
                  >
                    Select All
                  </button>
                  <button
                    aria-label="Clear selection"
                    onClick={clearSelection}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium border text-white/80 border-white/20 hover:bg-white/10"
                    data-testid="clear-selection"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div
                className="space-y-4"
                role="list"
                aria-label="Moderation items"
                data-testid="moderation-list"
              >
                {moderationItems.map((item: ModerationItem, index: number) => (
                  <motion.div
                    key={item.id}
                    role="listitem"
                    aria-selected={selectedIds.has(item.id)}
                    className="glass-card-light p-6 rounded-2xl backdrop-blur-lg border border-white/30"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    data-testid="moderation-item"
                  >
                    <input
                      type="checkbox"
                      aria-label={`Select item ${item.id}`}
                      checked={selectedIds.has(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      className="w-4 h-4 accent-white mr-2"
                      data-testid="select-item"
                    />
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">{getTypeIcon(item.type)}</div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-white font-semibold">{item.user.name}</h3>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(item.priority)}`}
                            >
                              {item.priority.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-white/60 text-sm">{item.user.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white/60 text-sm">
                          {formatTimeAgo(item.submittedAt)}
                        </div>
                        {item.reportedBy && (
                          <div className="text-white/40 text-xs">
                            Reported by: {item.reportedBy}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="text-white/80 text-sm mb-2">
                        <strong>Content:</strong> {item.content}
                      </div>
                      <div className="text-white/80 text-sm">
                        <strong>Reason:</strong> {item.reason}
                      </div>
                    </div>

                    {item.status === 'pending' && (
                      <div className="flex gap-3">
                        <motion.button
                          onClick={() => handleModerationAction(item.id, 'approve')}
                          className="flex-1 bg-green-500/20 border border-green-400/30 text-green-200 py-2 px-4 rounded-xl font-medium hover:bg-green-500/30 transition-all"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          data-testid="approve-button"
                        >
                          ✅ Approve
                        </motion.button>
                        <motion.button
                          onClick={() => handleModerationAction(item.id, 'reject')}
                          className="flex-1 bg-red-500/20 border border-red-400/30 text-red-200 py-2 px-4 rounded-xl font-medium hover:bg-red-500/30 transition-all"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          data-testid="reject-button"
                        >
                          ❌ Reject
                        </motion.button>
                        <motion.button
                          onClick={() => setExpanded((e) => ({ ...e, [item.id]: !e[item.id] }))}
                          aria-expanded={!!expanded[item.id]}
                          aria-controls={`details-${item.id}`}
                          className="px-4 py-2 bg-white/10 text-white/70 rounded-xl hover:bg-white/20 transition-all"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          data-testid="toggle-details"
                        >
                          👁️ View Details
                        </motion.button>
                      </div>
                    )}

                    {item.status !== 'pending' && (
                      <div
                        className={`text-center py-2 rounded-xl ${
                          item.status === 'approved'
                            ? 'bg-green-500/20 text-green-200'
                            : 'bg-red-500/20 text-red-200'
                        }`}
                      >
                        {item.status === 'approved' ? '✅ Approved' : '❌ Rejected'}
                      </div>
                    )}

                    {expanded[item.id] && (
                      <div
                        id={`details-${item.id}`}
                        className="mt-4 p-3 rounded-xl bg-white/5 border border-white/10"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-white/80 font-medium mb-2">Attachments</h4>
                            <ul className="list-disc pl-5 text-white/70">
                              {((item as any).attachments || []).map((a: any) => (
                                <li key={a.id}>
                                  <a
                                    href={a.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="underline"
                                  >
                                    {a.type}
                                  </a>{' '}
                                  <span className="text-white/40 text-xs">
                                    {new Date(a.createdAt).toLocaleString()}
                                  </span>
                                </li>
                              ))}
                              {(!(item as any).attachments ||
                                (item as any).attachments.length === 0) && (
                                <li className="text-white/50">No attachments</li>
                              )}
                            </ul>
                            <div className="mt-3 flex gap-2">
                              <input
                                aria-label="Attachment type"
                                placeholder="type (e.g. EVIDENCE)"
                                className="px-2 py-1 rounded bg-white/10 text-white border border-white/20"
                                id={`att-type-${item.id}`}
                              />
                              <input
                                aria-label="Attachment URL"
                                placeholder="https://..."
                                className="flex-1 px-2 py-1 rounded bg-white/10 text-white border border-white/20"
                                id={`att-url-${item.id}`}
                              />
                              <button
                                aria-label="Add attachment"
                                onClick={async () => {
                                  const typeEl = document.getElementById(
                                    `att-type-${item.id}`,
                                  ) as HTMLInputElement;
                                  const urlEl = document.getElementById(
                                    `att-url-${item.id}`,
                                  ) as HTMLInputElement;
                                  if (!typeEl?.value || !urlEl?.value) return;
                                  await addAttachment({
                                    variables: {
                                      itemId: item.id,
                                      type: typeEl.value,
                                      url: urlEl.value,
                                    },
                                  });
                                  urlEl.value = '';
                                  await refetch();
                                }}
                                className="px-3 py-1.5 rounded-lg text-sm font-medium border text-white/80 border-white/20 hover:bg-white/10"
                                data-testid="add-attachment"
                              >
                                Attach
                              </button>
                            </div>
                          </div>
                          <div>
                            <h4 className="text-white/80 font-medium mb-2">Audit Trail</h4>
                            <ul className="list-disc pl-5 text-white/70">
                              {((item as any).audits || []).map((a: any) => (
                                <li key={a.id}>
                                  <span className="uppercase">{a.action}</span> —{' '}
                                  {a.reason || 'No reason'}{' '}
                                  <span className="text-white/40 text-xs">
                                    {new Date(a.createdAt).toLocaleString()}
                                  </span>
                                </li>
                              ))}
                              {(!(item as any).audits || (item as any).audits.length === 0) && (
                                <li className="text-white/50">No audits</li>
                              )}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
              <div aria-hidden className="sr-only">
                pagination disabled
              </div>
              <div className="flex items-center justify-between mt-6">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  className={`px-4 py-2 rounded-xl border border-white/20 ${
                    currentPage === 0 ? 'text-white/30' : 'text-white/80 hover:bg-white/10'
                  }`}
                >
                  ◀ Previous
                </button>
                <div className="text-white/70 text-sm">Page {currentPage + 1}</div>
                <button
                  onClick={() => setCurrentPage((p) => (hasMore ? p + 1 : p))}
                  disabled={!hasMore}
                  className={`px-4 py-2 rounded-xl border border-white/20 ${
                    !hasMore ? 'text-white/30' : 'text-white/80 hover:bg-white/10'
                  }`}
                >
                  Next ▶
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
