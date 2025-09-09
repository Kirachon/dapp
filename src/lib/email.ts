import sgMail from '@sendgrid/mail';
import crypto from 'crypto';
import { prisma } from './db';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export interface EmailTemplate {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export class EmailService {
  private static instance: EmailService;
  private fromEmail: string;

  private constructor() {
    this.fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@yourplatform.com';
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  async sendEmail(template: EmailTemplate): Promise<boolean> {
    try {
      const msg = {
        to: template.to,
        from: this.fromEmail,
        subject: template.subject,
        text: template.text,
        html: template.html,
      };

      await sgMail.send(msg);
      return true;
    } catch (error) {
      console.error('Email sending failed:', error);
      return false;
    }
  }

  async generateVerificationToken(userId: string, email: string): Promise<string> {
    // Generate secure random token
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store token in database
    await (prisma as any).verificationToken?.create({
      data: {
        identifier: email,
        token,
        expires,
        userId,
      },
    });

    return token;
  }

  async verifyToken(token: string): Promise<{ valid: boolean; userId?: string; email?: string }> {
    try {
      const verificationToken = await (prisma as any).verificationToken?.findUnique({
        where: { token },
        include: { user: true },
      });

      if (!verificationToken) {
        return { valid: false };
      }

      if (verificationToken.expires < new Date()) {
        // Clean up expired token
        await (prisma as any).verificationToken?.delete({
          where: { token },
        });
        return { valid: false };
      }

      return {
        valid: true,
        userId: verificationToken.userId || undefined,
        email: verificationToken.identifier,
      };
    } catch (error) {
      console.error('Token verification failed:', error);
      return { valid: false };
    }
  }

  async markEmailAsVerified(userId: string): Promise<boolean> {
    try {
      await (prisma as any).user.update({
        where: { id: userId },
        data: { emailVerified: new Date() },
      });

      // Clean up verification tokens for this user
      await (prisma as any).verificationToken?.deleteMany({
        where: { userId },
      });

      return true;
    } catch (error) {
      console.error('Email verification update failed:', error);
      return false;
    }
  }

  createVerificationEmailTemplate(email: string, token: string): EmailTemplate {
    const verificationUrl = `${process.env.NEXTAUTH_URL}/auth/verify-email?token=${token}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email Address</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; background: #f9fafb; }
            .button { 
              display: inline-block; 
              background: #2563eb; 
              color: white; 
              padding: 12px 24px; 
              text-decoration: none; 
              border-radius: 6px; 
              margin: 20px 0; 
            }
            .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Our Platform!</h1>
            </div>
            <div class="content">
              <h2>Verify Your Email Address</h2>
              <p>Thank you for creating an account. To complete your registration and secure your account, please verify your email address by clicking the button below:</p>
              
              <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verify Email Address</a>
              </div>
              
              <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #2563eb;">${verificationUrl}</p>
              
              <p><strong>Important:</strong> This verification link will expire in 24 hours for security reasons.</p>
              
              <p>If you didn't create an account with us, you can safely ignore this email.</p>
            </div>
            <div class="footer">
              <p>This email was sent to ${email}</p>
              <p>© 2025 Your Platform. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      Welcome to Our Platform!
      
      Thank you for creating an account. To complete your registration, please verify your email address by visiting this link:
      
      ${verificationUrl}
      
      This verification link will expire in 24 hours for security reasons.
      
      If you didn't create an account with us, you can safely ignore this email.
      
      This email was sent to ${email}
    `;

    return {
      to: email,
      subject: 'Verify Your Email Address',
      html,
      text,
    };
  }

  async sendVerificationEmail(userId: string, email: string): Promise<boolean> {
    try {
      const token = await this.generateVerificationToken(userId, email);
      const template = this.createVerificationEmailTemplate(email, token);
      return await this.sendEmail(template);
    } catch (error) {
      console.error('Verification email sending failed:', error);
      return false;
    }
  }

  async resendVerificationEmail(email: string): Promise<boolean> {
    try {
      const user = await (prisma as any).user.findUnique({
        where: { email },
      });

      if (!user || user.emailVerified) {
        return false;
      }

      // Clean up existing tokens
      await prisma.verificationToken.deleteMany({
        where: { userId: user.id },
      });

      return await this.sendVerificationEmail(user.id, email);
    } catch (error) {
      console.error('Resend verification email failed:', error);
      return false;
    }
  }


  createEmailChangeVerificationTemplate(oldEmail: string, newEmail: string, token: string): EmailTemplate {
    const verificationUrl = `${process.env.NEXTAUTH_URL}/auth/verify-email-change?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your New Email Address</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; background: #f9fafb; }
            .button {
              display: inline-block;
              background: #2563eb;
              color: white;
              padding: 12px 24px;
              text-decoration: none;
              border-radius: 6px;
              margin: 20px 0;
            }
            .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
            .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Email Address Change</h1>
            </div>
            <div class="content">
              <h2>Verify Your New Email Address</h2>
              <p>You requested to change your email address from <strong>${oldEmail}</strong> to <strong>${newEmail}</strong>.</p>

              <div class="warning">
                <p><strong>Important:</strong> This will change your login email address. Make sure you have access to this email account.</p>
              </div>

              <p>To confirm this change, please click the button below:</p>

              <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verify New Email Address</a>
              </div>

              <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #2563eb;">${verificationUrl}</p>

              <p><strong>Security Notice:</strong> This verification link will expire in 24 hours. If you didn't request this change, please ignore this email and contact support immediately.</p>
            </div>
            <div class="footer">
              <p>This email was sent to ${newEmail}</p>
              <p>© 2025 Your Platform. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      Email Address Change Verification

      You requested to change your email address from ${oldEmail} to ${newEmail}.

      To confirm this change, please visit this link:
      ${verificationUrl}

      This verification link will expire in 24 hours for security reasons.

      If you didn't request this change, please ignore this email and contact support immediately.

      This email was sent to ${newEmail}
    `;

    return {
      to: newEmail,
      subject: 'Verify Your New Email Address',
      html,
      text,
    };
  }

  createWelcomeSequenceTemplate(email: string, firstName: string, step: number): EmailTemplate {
    const welcomeSequences = {
      1: {
        subject: `Welcome to the platform, ${firstName}! 🎉`,
        title: 'Welcome to Your Journey!',
        content: `
          <p>Hi ${firstName},</p>
          <p>Welcome to our platform! We're thrilled to have you join our community.</p>
          <p>You've taken the first step towards an amazing experience. Here's what you can expect:</p>
          <ul>
            <li>✨ Personalized dashboard tailored to your needs</li>
            <li>🎯 Goal tracking and achievement system</li>
            <li>📊 Detailed analytics and insights</li>
            <li>🤝 Connect with like-minded individuals</li>
          </ul>
          <p>Ready to get started? Complete your profile setup to unlock all features!</p>
        `,
        cta: 'Complete Your Profile',
        ctaUrl: `${process.env.NEXTAUTH_URL}/onboarding/profile`,
      },
      2: {
        subject: `${firstName}, discover what makes us special ✨`,
        title: 'Discover Your New Favorite Features',
        content: `
          <p>Hi ${firstName},</p>
          <p>Now that you're settling in, let's explore some of our most loved features:</p>
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1f2937; margin-top: 0;">🎯 Smart Goal Setting</h3>
            <p>Set meaningful goals and track your progress with our intelligent system.</p>
          </div>
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1f2937; margin-top: 0;">📈 Progress Analytics</h3>
            <p>Get insights into your journey with detailed analytics and reports.</p>
          </div>
          <p>Take a moment to explore these features - they're designed to help you succeed!</p>
        `,
        cta: 'Explore Features',
        ctaUrl: `${process.env.NEXTAUTH_URL}/dashboard`,
      },
      3: {
        subject: `${firstName}, you're doing great! Here are some tips 💡`,
        title: 'Pro Tips for Success',
        content: `
          <p>Hi ${firstName},</p>
          <p>You're making great progress! Here are some pro tips from our most successful users:</p>
          <div style="border-left: 4px solid #3b82f6; padding-left: 16px; margin: 20px 0;">
            <p><strong>💡 Tip #1:</strong> Set small, achievable daily goals to build momentum.</p>
          </div>
          <div style="border-left: 4px solid #10b981; padding-left: 16px; margin: 20px 0;">
            <p><strong>🎯 Tip #2:</strong> Use the progress tracking to celebrate small wins.</p>
          </div>
          <div style="border-left: 4px solid #8b5cf6; padding-left: 16px; margin: 20px 0;">
            <p><strong>🤝 Tip #3:</strong> Connect with others who share similar goals.</p>
          </div>
          <p>Remember, every expert was once a beginner. You've got this!</p>
        `,
        cta: 'Set Your First Goal',
        ctaUrl: `${process.env.NEXTAUTH_URL}/goals`,
      },
    };

    const sequence = welcomeSequences[step as keyof typeof welcomeSequences];
    if (!sequence) {
      throw new Error(`Invalid welcome sequence step: ${step}`);
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${sequence.subject}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { padding: 30px 20px; background: #ffffff; }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 14px 28px;
              text-decoration: none;
              border-radius: 8px;
              margin: 20px 0;
              font-weight: bold;
            }
            .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 14px; background: #f9fafb; border-radius: 0 0 8px 8px; }
            ul { padding-left: 20px; }
            li { margin: 8px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 28px;">${sequence.title}</h1>
            </div>
            <div class="content">
              ${sequence.content}

              <div style="text-align: center; margin: 30px 0;">
                <a href="${sequence.ctaUrl}" class="button">${sequence.cta}</a>
              </div>

              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                Questions? Just reply to this email - we're here to help!
              </p>
            </div>
            <div class="footer">
              <p>This email was sent to ${email}</p>
              <p>© 2025 Your Platform. All rights reserved.</p>
              <p>
                <a href="${process.env.NEXTAUTH_URL}/unsubscribe" style="color: #6b7280;">Unsubscribe</a> |
                <a href="${process.env.NEXTAUTH_URL}/preferences" style="color: #6b7280;">Email Preferences</a>
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      ${sequence.title}

      Hi ${firstName},

      ${sequence.content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()}

      ${sequence.cta}: ${sequence.ctaUrl}

      Questions? Just reply to this email - we're here to help!

      This email was sent to ${email}
      © 2025 Your Platform. All rights reserved.
    `;

    return {
      to: email,
      subject: sequence.subject,
      html,
      text,
    };
  }

  async sendWelcomeSequence(userId: string, email: string, firstName: string, step: number): Promise<boolean> {
    try {
      const template = this.createWelcomeSequenceTemplate(email, firstName, step);
      return await this.sendEmail(template);
    } catch (error) {
      console.error('Welcome sequence email sending failed:', error);
      return false;
    }
  }
}

export const emailService = EmailService.getInstance();
