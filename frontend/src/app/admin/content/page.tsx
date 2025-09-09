'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { gql } from '@apollo/client';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
// Tabs/Switch/Textarea/Badge components are not available; implement minimal UI in-place
// Remove unused imports to satisfy lint and build


const GET_CONTENT_DATA = gql`
  query GetContentData {
    featureFlags {
      key
      name
      description
      enabled
      targetAudience
      rolloutPercentage
    }
    emailTemplates {
      key
      name
      subject
      category
      enabled
    }
    appConfigs {
      key
      value
      description
      category
      isPublic
    }
    contentPages {
      slug
      title
      published
    }
  }
`;

const UPDATE_FEATURE_FLAG = gql`
  mutation UpdateFeatureFlag($key: String!, $enabled: Boolean, $rolloutPercentage: Int) {
    updateFeatureFlag(key: $key, enabled: $enabled, rolloutPercentage: $rolloutPercentage)
  }
`;

const UPDATE_APP_CONFIG = gql`
  mutation UpdateAppConfig($key: String!, $value: String!, $description: String) {
    updateAppConfig(key: $key, value: $value, description: $description)
  }
`;

export default function AdminContentPage() {
  const { data, loading, error, refetch } = useQuery(GET_CONTENT_DATA);
  const [updateFeatureFlag] = useMutation(UPDATE_FEATURE_FLAG);
  const [updateAppConfig] = useMutation(UPDATE_APP_CONFIG);
  
  const [editingConfig, setEditingConfig] = useState<string | null>(null);
  const [configValue, setConfigValue] = useState('');

  const handleFeatureFlagToggle = async (key: string, enabled: boolean) => {
    try {
      await updateFeatureFlag({
        variables: { key, enabled }
      });
      refetch();
    } catch (error) {
      console.error('Error updating feature flag:', error);
    }
  };

  const handleConfigSave = async (key: string) => {
    try {
      await updateAppConfig({
        variables: { 
          key, 
          value: configValue,
          description: data?.appConfigs?.find((c: any) => c.key === key)?.description
        }
      });
      setEditingConfig(null);
      refetch();
    } catch (error) {
      console.error('Error updating config:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Error loading content</h3>
          <p className="text-red-600 text-sm mt-1">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Content Management</h1>
        <p className="text-gray-600 mt-2">Manage app content, feature flags, and configuration</p>
      </div>

      {/* Simplified content without tabs/switch components to avoid missing UI imports */}
      <div className="space-y-6">
        <section>
          <Card>
            <CardHeader>
              <CardTitle>Feature Flags</CardTitle>
              <CardDescription>Control feature rollouts and enable/disable functionality</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data?.featureFlags?.map((flag: any) => (
                  <div key={flag.key} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{flag.name}</h3>
                        <span className="text-xs px-2 py-1 rounded bg-gray-100 border">
                          {flag.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                        <span className="text-xs px-2 py-1 rounded border">{flag.targetAudience}</span>
                      </div>
                      {flag.description && (
                        <p className="text-sm text-gray-600 mt-1">{flag.description}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">Key: {flag.key} • Rollout: {flag.rolloutPercentage}%</p>
                    </div>
                    <button
                      className="px-3 py-1 text-sm border rounded"
                      onClick={() => handleFeatureFlagToggle(flag.key, !flag.enabled)}
                    >
                      {flag.enabled ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <section>
          <Card>
            <CardHeader>
              <CardTitle>App Configuration</CardTitle>
              <CardDescription>Manage application settings and configuration values</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data?.appConfigs?.map((config: any) => (
                  <div key={config.key} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{config.key}</h3>
                        <span className="text-xs px-2 py-1 rounded border">{config.category}</span>
                        {config.isPublic && <span className="text-xs px-2 py-1 rounded bg-gray-100 border">Public</span>}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingConfig(config.key);
                          setConfigValue(config.value);
                        }}
                      >
                        Edit
                      </Button>
                    </div>

                    {config.description && (
                      <p className="text-sm text-gray-600 mb-2">{config.description}</p>
                    )}

                    {editingConfig === config.key ? (
                      <div className="space-y-2">
                        <textarea
                          value={configValue}
                          onChange={(e) => setConfigValue(e.target.value)}
                          placeholder="Configuration value (JSON format)"
                          rows={3}
                          className="w-full border rounded p-2"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleConfigSave(config.key)}>
                            Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingConfig(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <code className="text-sm bg-gray-100 p-2 rounded block">{config.value}</code>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <section>
          <Card>
            <CardHeader>
              <CardTitle>Email Templates</CardTitle>
              <CardDescription>Manage email templates for notifications and communications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data?.emailTemplates?.map((template: any) => (
                  <div key={template.key} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{template.name}</h3>
                          <span className="text-xs px-2 py-1 rounded border">{template.category}</span>
                          <span className="text-xs px-2 py-1 rounded bg-gray-100 border">{template.enabled ? 'Enabled' : 'Disabled'}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{template.subject}</p>
                        <p className="text-xs text-gray-500 mt-1">Key: {template.key}</p>
                      </div>
                      <Button size="sm" variant="outline">Edit Template</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <section>
          <Card>
            <CardHeader>
              <CardTitle>Content Pages</CardTitle>
              <CardDescription>Manage static content pages like privacy policy and terms</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data?.contentPages?.map((page: any) => (
                  <div key={page.slug} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{page.title}</h3>
                          <span className="text-xs px-2 py-1 rounded bg-gray-100 border">{page.published ? 'Published' : 'Draft'}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Slug: /{page.slug}</p>
                      </div>
                      <Button size="sm" variant="outline">Edit Page</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
