import { logger } from '../lib/logger';

export interface DevNotification {
  email: string;
  itemId: string;
  action: string;
  reason?: string;
  createdAt: string;
}

const devNotifications: DevNotification[] = [];

export async function notifyModerationDecision(
  email: string,
  itemId: string,
  action: string,
  reason?: string,
): Promise<void> {
  try {
    if (process.env.NODE_ENV !== 'production') {
      devNotifications.push({ email, itemId, action, reason, createdAt: new Date().toISOString() });
      logger.info('Dev notification recorded', {
        operation: 'notify_moderation_decision',
        metadata: { email, itemId, action },
      });
      return;
    }

    // TODO: Production email provider integration (e.g., SendGrid/SMTP)
    logger.info('Notification would be sent in production', {
      operation: 'notify_moderation_decision',
      metadata: { email, itemId, action },
    });
  } catch (e: any) {
    logger.warn('Failed to record/send notification', {
      operation: 'notify_moderation_decision',
      metadata: { email, itemId, action, error: e?.message || String(e) },
    });
  }
}

export function getDevNotifications(): DevNotification[] {
  return devNotifications;
}

export function clearDevNotifications(): void {
  devNotifications.splice(0, devNotifications.length);
}
