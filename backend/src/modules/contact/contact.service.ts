import nodemailer from 'nodemailer';
import { loadEnvConfig } from '../../config/env.js';
import { logger } from '../../infrastructure/logger/index.js';
import { ContactSubmission, type IContactSubmission } from '../../models/contact.model.js';
import type { SubmitContactInput } from './contact.schemas.js';

const config = loadEnvConfig();

export class ContactService {
  private static getTransporter() {
    if (!config.ZOHO_SMTP_USER || !config.ZOHO_SMTP_PASS) {
      return null;
    }

    return nodemailer.createTransport({
      host: config.ZOHO_SMTP_HOST,
      port: config.ZOHO_SMTP_PORT,
      secure: config.ZOHO_SMTP_SECURE,
      auth: {
        user: config.ZOHO_SMTP_USER,
        pass: config.ZOHO_SMTP_PASS,
      },
    });
  }

  static async submitContactForm(input: SubmitContactInput): Promise<{
    success: boolean;
    message: string;
    submission: Partial<IContactSubmission>;
  }> {
    const submission = await ContactSubmission.create({
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      category: input.category.trim(),
      subject: input.subject?.trim() || '',
      message: input.message.trim(),
      status: 'pending',
      emailSent: false,
    });

    const transporter = ContactService.getTransporter();

    if (transporter) {
      try {
        const fromAddress = config.ZOHO_FROM_EMAIL || config.ZOHO_SMTP_USER;
        const receiverAddress = config.CONTACT_RECEIVER_EMAIL || fromAddress;

        // 1. Admin Notification Email
        const adminMailOptions = {
          from: `"LankaEats Contact Form" <${fromAddress}>`,
          to: receiverAddress,
          replyTo: input.email,
          subject: `[LankaEats Inquiry - ${input.category}] ${input.subject || 'New Contact Submission'}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded-radius: 12px;">
              <h2 style="color: #e11d48; margin-top: 0;">New LankaEats Contact Submission</h2>
              <p><strong>Category:</strong> ${input.category}</p>
              <p><strong>Name:</strong> ${input.name}</p>
              <p><strong>Email:</strong> <a href="mailto:${input.email}">${input.email}</a></p>
              <p><strong>Subject:</strong> ${input.subject || 'N/A'}</p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
              <h4 style="color: #334155;">Message:</h4>
              <p style="background: #f8fafc; padding: 15px; border-radius: 8px; font-size: 14px; white-space: pre-wrap;">${input.message}</p>
              <footer style="margin-top: 20px; font-size: 12px; color: #94a3b8; text-align: center;">
                Sent automatically via LankaEats Finland Marketplace Backend
              </footer>
            </div>
          `,
        };

        // 2. Customer Auto-Reply Confirmation Email
        const customerMailOptions = {
          from: `"LankaEats Support" <${fromAddress}>`,
          to: input.email,
          subject: `We've received your message — LankaEats Finland`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
              <h2 style="color: #e11d48; margin-top: 0;">Hei ${input.name}!</h2>
              <p>Thank you for reaching out to LankaEats Finland.</p>
              <p>We've received your inquiry regarding <strong>"${input.category}"</strong> and our support team in Helsinki is currently reviewing it.</p>
              <p>We aim to respond to all inquiries within 24 hours.</p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
              <p style="font-size: 13px; color: #64748b;">Your submitted message summary:</p>
              <blockquote style="background: #f8fafc; padding: 12px; border-left: 4px solid #e11d48; font-size: 13px; font-style: italic;">"${input.message}"</blockquote>
              <p style="margin-top: 20px;">Best regards,<br/><strong>The LankaEats Team</strong><br/>Helsinki, Finland</p>
            </div>
          `,
        };

        await Promise.all([
          transporter.sendMail(adminMailOptions),
          transporter.sendMail(customerMailOptions),
        ]);

        submission.emailSent = true;
        submission.status = 'processed';
        await submission.save();

        logger.info({ submissionId: submission._id, email: input.email }, 'Zoho Mail notifications dispatched successfully');
      } catch (error) {
        logger.error({ err: error, submissionId: submission._id }, 'Failed to dispatch Zoho Mail notification');
        submission.status = 'failed';
        await submission.save();
      }
    } else {
      logger.info({ submissionId: submission._id, email: input.email }, 'Zoho SMTP credentials not set. Contact form submission saved to database.');
      submission.status = 'processed';
      await submission.save();
    }

    return {
      success: true,
      message: 'Your message has been sent successfully!',
      submission: {
        id: submission._id.toString(),
        name: submission.name,
        email: submission.email,
        category: submission.category,
        status: submission.status,
        emailSent: submission.emailSent,
        createdAt: submission.createdAt,
      },
    };
  }

  static async getSubmissions() {
    return ContactSubmission.find().sort({ createdAt: -1 });
  }
}
