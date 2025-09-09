import { PrismaClient } from '@prisma/client';

// Note: Prisma client will be injected by the main application
let prisma: PrismaClient;

export interface FeatureFlagConfig {
  key: string;
  name: string;
  description?: string;
  enabled: boolean;
  targetAudience: 'all' | 'premium' | 'beta';
  rolloutPercentage: number;
}

export interface EmailTemplateConfig {
  key: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  variables: string[];
  category: 'auth' | 'notification' | 'marketing';
  enabled: boolean;
}

export interface AppConfigValue {
  key: string;
  value: any;
  description?: string;
  category: string;
  isPublic: boolean;
}

export interface ContentPageData {
  slug: string;
  title: string;
  content: string;
  metaDescription?: string;
  published: boolean;
}

export interface ContentCategoryData {
  key: string;
  name: string;
  description?: string;
}

class ContentService {
  // Initialize the Prisma client
  init(prismaClient: PrismaClient) {
    prisma = prismaClient;
  }

  // Feature Flags
  async getFeatureFlag(key: string): Promise<FeatureFlagConfig | null> {
    try {
      const flag = await prisma.featureFlag.findUnique({
        where: { key }
      });
      
      if (!flag) return null;
      
      return {
        key: flag.key,
        name: flag.name,
        description: flag.description || undefined,
        enabled: flag.enabled,
        targetAudience: flag.targetAudience as 'all' | 'premium' | 'beta',
        rolloutPercentage: flag.rolloutPercentage
      };
    } catch (error) {
      console.error('Error fetching feature flag:', error);
      return null;
    }
  }

  async getAllFeatureFlags(): Promise<FeatureFlagConfig[]> {
    try {
      const flags = await prisma.featureFlag.findMany({
        orderBy: { name: 'asc' }
      });
      
      return flags.map(flag => ({
        key: flag.key,
        name: flag.name,
        description: flag.description || undefined,
        enabled: flag.enabled,
        targetAudience: flag.targetAudience as 'all' | 'premium' | 'beta',
        rolloutPercentage: flag.rolloutPercentage
      }));
    } catch (error) {
      console.error('Error fetching feature flags:', error);
      return [];
    }
  }

  async updateFeatureFlag(key: string, updates: Partial<FeatureFlagConfig>): Promise<boolean> {
    try {
      await prisma.featureFlag.update({
        where: { key },
        data: {
          ...updates,
          updatedAt: new Date()
        }
      });
      return true;
    } catch (error) {
      console.error('Error updating feature flag:', error);
      return false;
    }
  }

  async isFeatureEnabled(key: string, userType: 'all' | 'premium' | 'beta' = 'all'): Promise<boolean> {
    try {
      const flag = await this.getFeatureFlag(key);
      if (!flag || !flag.enabled) return false;
      
      // Check target audience
      if (flag.targetAudience !== 'all' && flag.targetAudience !== userType) {
        return false;
      }
      
      // Check rollout percentage
      if (flag.rolloutPercentage < 100) {
        // Simple hash-based rollout (in production, use user ID for consistency)
        const hash = Math.abs(key.split('').reduce((a, b) => a + b.charCodeAt(0), 0));
        return (hash % 100) < flag.rolloutPercentage;
      }
      
      return true;
    } catch (error) {
      console.error('Error checking feature flag:', error);
      return false;
    }
  }

  // Email Templates
  async getEmailTemplate(key: string): Promise<EmailTemplateConfig | null> {
    try {
      const template = await prisma.emailTemplate.findUnique({
        where: { key }
      });
      
      if (!template) return null;
      
      return {
        key: template.key,
        name: template.name,
        subject: template.subject,
        htmlContent: template.htmlContent,
        textContent: template.textContent || undefined,
        variables: Array.isArray(template.variables) ? template.variables as string[] : [],
        category: template.category as 'auth' | 'notification' | 'marketing',
        enabled: template.enabled
      };
    } catch (error) {
      console.error('Error fetching email template:', error);
      return null;
    }
  }

  async getAllEmailTemplates(): Promise<EmailTemplateConfig[]> {
    try {
      const templates = await prisma.emailTemplate.findMany({
        orderBy: { name: 'asc' }
      });
      
      return templates.map(template => ({
        key: template.key,
        name: template.name,
        subject: template.subject,
        htmlContent: template.htmlContent,
        textContent: template.textContent || undefined,
        variables: Array.isArray(template.variables) ? template.variables as string[] : [],
        category: template.category as 'auth' | 'notification' | 'marketing',
        enabled: template.enabled
      }));
    } catch (error) {
      console.error('Error fetching email templates:', error);
      return [];
    }
  }

  async updateEmailTemplate(key: string, updates: Partial<EmailTemplateConfig>): Promise<boolean> {
    try {
      await prisma.emailTemplate.update({
        where: { key },
        data: {
          ...updates,
          updatedAt: new Date()
        }
      });
      return true;
    } catch (error) {
      console.error('Error updating email template:', error);
      return false;
    }
  }

  // App Configuration
  async getAppConfig(key: string): Promise<any> {
    try {
      const config = await prisma.appConfig.findUnique({
        where: { key }
      });
      
      return config?.value || null;
    } catch (error) {
      console.error('Error fetching app config:', error);
      return null;
    }
  }

  async getAllAppConfigs(publicOnly: boolean = false): Promise<AppConfigValue[]> {
    try {
      const configs = await prisma.appConfig.findMany({
        where: publicOnly ? { isPublic: true } : undefined,
        orderBy: { key: 'asc' }
      });
      
      return configs.map(config => ({
        key: config.key,
        value: config.value,
        description: config.description || undefined,
        category: config.category,
        isPublic: config.isPublic
      }));
    } catch (error) {
      console.error('Error fetching app configs:', error);
      return [];
    }
  }

  async updateAppConfig(key: string, value: any, description?: string): Promise<boolean> {
    try {
      await prisma.appConfig.upsert({
        where: { key },
        update: {
          value,
          description,
          updatedAt: new Date()
        },
        create: {
          key,
          value,
          description,
          category: 'general'
        }
      });
      return true;
    } catch (error) {
      console.error('Error updating app config:', error);
      return false;
    }
  }

  // Content Pages
  async getContentPage(slug: string): Promise<ContentPageData | null> {
    try {
      const page = await prisma.contentPage.findUnique({
        where: { slug }
      });
      
      if (!page || !page.published) return null;
      
      return {
        slug: page.slug,
        title: page.title,
        content: page.content,
        metaDescription: page.metaDescription || undefined,
        published: page.published
      };
    } catch (error) {
      console.error('Error fetching content page:', error);
      return null;
    }
  }

  async getAllContentPages(publishedOnly: boolean = true): Promise<ContentPageData[]> {
    try {
      const pages = await prisma.contentPage.findMany({
        where: publishedOnly ? { published: true } : undefined,
        orderBy: { title: 'asc' }
      });
      
      return pages.map(page => ({
        slug: page.slug,
        title: page.title,
        content: page.content,
        metaDescription: page.metaDescription || undefined,
        published: page.published
      }));
    } catch (error) {
      console.error('Error fetching content pages:', error);
      return [];
    }
  }

  async updateContentPage(slug: string, updates: Partial<ContentPageData>): Promise<boolean> {
    try {
      await prisma.contentPage.update({
        where: { slug },
        data: {
          ...updates,
          updatedAt: new Date()
        }
      });
      return true;
    } catch (error) {
      console.error('Error updating content page:', error);
      return false;
    }
  }

  // Content Categories
  async getContentCategory(key: string): Promise<ContentCategoryData | null> {
    try {
      const category = await (prisma as any).contentCategory?.findUnique({
        where: { key }
      });

      if (!category) return null;

      return {
        key: category.key,
        name: category.name,
        description: category.description || undefined
      };
    } catch (error) {
      console.error('Error fetching content category:', error);
      return null;
    }
  }

  async getAllContentCategories(): Promise<ContentCategoryData[]> {
    try {
      const categories = await ((prisma as any).contentCategory?.findMany({
        orderBy: { name: 'asc' }
      }) ?? []);

      return (categories as any[]).map((category: any) => ({
        key: category.key,
        name: category.name,
        description: category.description || undefined
      }));
    } catch (error) {
      console.error('Error fetching content categories:', error);
      return [];
    }
  }

  async updateContentCategory(key: string, updates: Partial<ContentCategoryData>): Promise<boolean> {
    try {
      const cc = (prisma as any).contentCategory; if (!cc) return true; await cc.upsert({
        where: { key },
        update: {
          ...updates,
          updatedAt: new Date()
        },
        create: {
          key,
          name: updates.name || key,
          description: updates.description
        }
      });
      return true;
    } catch (error) {
      console.error('Error updating content category:', error);
      return false;
    }
  }

  // Utility method to render email template with variables
  renderEmailTemplate(template: EmailTemplateConfig, variables: Record<string, string>): {
    subject: string;
    htmlContent: string;
    textContent?: string;
  } {
    let subject = template.subject;
    let htmlContent = template.htmlContent;
    let textContent = template.textContent;

    // Replace variables in template
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      subject = subject.replace(new RegExp(placeholder, 'g'), value);
      htmlContent = htmlContent.replace(new RegExp(placeholder, 'g'), value);
      if (textContent) {
        textContent = textContent.replace(new RegExp(placeholder, 'g'), value);
      }
    });

    return {
      subject,
      htmlContent,
      textContent
    };
  }
}

export const contentService = new ContentService();
