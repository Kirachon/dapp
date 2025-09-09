import { gql } from '@apollo/client';

// Admin Stats Query
export const ADMIN_STATS = gql`
  query AdminStats {
    adminStats {
      totalUsers
      activeUsers
      totalMatches
      pendingReports
      pendingPhotos
      revenue
      newUsersToday
      newUsersThisWeek
      newUsersThisMonth
    }
  }
`;

// Admin Users Query
export const ADMIN_USERS = gql`
  query AdminUsers($limit: Int, $offset: Int, $status: UserStatus, $search: String) {
    adminUsers(limit: $limit, offset: $offset, status: $status, search: $search) {
      users {
        id
        email
        profile {
          name
          age
          photos
        }
        status
        createdAt
        lastActiveAt
        reportCount
        verified
        roles
      }
      totalCount
      hasMore
    }
  }
`;

// Admin Moderation Query
export const ADMIN_MODERATION = gql`
  query AdminModeration($limit: Int, $offset: Int, $status: ModerationStatus, $priority: ModerationPriority) {
    adminModeration(limit: $limit, offset: $offset, status: $status, priority: $priority) {
      items {
        id
        type
        user {
          id
          email
          profile {
            name
          }
        }
        content
        reason
        priority
        status
        submittedAt
        reportedBy
        reviewedAt
        reviewedBy
      }
      totalCount
      hasMore
    }
  }
`;

// Admin Reports Query
export const ADMIN_REPORTS = gql`
  query AdminReports($limit: Int, $offset: Int, $status: ReportStatus) {
    adminReports(limit: $limit, offset: $offset, status: $status) {
      reports {
        id
        reportedUser {
          id
          email
          profile {
            name
          }
        }
        reportedBy {
          id
          email
          profile {
            name
          }
        }
        reason
        description
        status
        priority
        createdAt
        reviewedAt
        reviewedBy
      }
      totalCount
      hasMore
    }
  }
`;

// Admin Mutations
export const ADMIN_BAN_USER = gql`
  mutation AdminBanUser($userId: ID!, $reason: String!) {
    adminBanUser(userId: $userId, reason: $reason)
  }
`;

export const ADMIN_UNBAN_USER = gql`
  mutation AdminUnbanUser($userId: ID!) {
    adminUnbanUser(userId: $userId)
  }
`;

export const ADMIN_VERIFY_USER = gql`
  mutation AdminVerifyUser($userId: ID!) {
    adminVerifyUser(userId: $userId)
  }
`;

export const ADMIN_DELETE_USER = gql`
  mutation AdminDeleteUser($userId: ID!) {
    adminDeleteUser(userId: $userId)
  }
`;

export const ADMIN_MODERATION_ACTION = gql`
  mutation AdminModerationAction($itemId: ID!, $action: String!, $reason: String) {
    adminModerationAction(itemId: $itemId, action: $action, reason: $reason)
  }
`;

export const ADMIN_RESOLVE_REPORT = gql`
  mutation AdminResolveReport($reportId: ID!, $action: String!, $reason: String) {
    adminResolveReport(reportId: $reportId, action: $action, reason: $reason)
  }
`;
