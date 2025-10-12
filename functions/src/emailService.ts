import * as admin from 'firebase-admin';
import { emailConfig } from './config';

export interface EmailData {
    to: string[];
    subject: string;
    html: string;
    text?: string;
}

export class EmailService {
    /**
     * Format email template with variables
     */
    static formatTemplate(template: string, variables: { [key: string]: any }): string {
        let formatted = template;
        Object.keys(variables).forEach(key => {
            const regex = new RegExp(`{${key}}`, 'g');
            formatted = formatted.replace(regex, variables[key] || '');
        });
        return formatted;
    }

    /**
     * Send email using Nodemailer with Gmail SMTP
     *
     * Configuration:
     * - Uses Gmail SMTP server (smtp.gmail.com)
     * - Requires App Password from Gmail account with 2FA enabled
     * - Credentials stored securely in Firebase Functions config
     *
     * Set configuration using:
     * firebase functions:config:set smtp.user="your-email@gmail.com"
     * firebase functions:config:set smtp.pass="your-app-password"
     * firebase functions:config:set smtp.host="smtp.gmail.com"
     * firebase functions:config:set smtp.port="587"
     */
    static async sendEmail(emailData: EmailData): Promise<boolean> {
        try {
            console.log('📧 Sending email to:', emailData.to);
            console.log('   Subject:', emailData.subject);

            // Using Nodemailer with Gmail SMTP
            const nodemailer = require('nodemailer');
            const functions = require('firebase-functions');

            // Get SMTP configuration from Firebase Functions config
            const smtpConfig = functions.config().smtp || {};

            const transporter = nodemailer.createTransport({
                host: smtpConfig.host || 'smtp.gmail.com',
                port: parseInt(smtpConfig.port || '587'),
                secure: false, // true for 465, false for 587
                auth: {
                    user: smtpConfig.user || 'hossamsharif1990@gmail.com',
                    pass: smtpConfig.pass || 'qcnf pfoq hvut teep'
                },
                tls: {
                    rejectUnauthorized: false // Allow self-signed certificates
                }
            });

            // Verify SMTP connection (optional but helps with debugging)
            try {
                await transporter.verify();
                console.log('✅ Gmail SMTP connection verified successfully');
            } catch (verifyError: any) {
                console.error('⚠️ SMTP verification warning:', verifyError.message);
                // Continue anyway, sendMail might still work
            }

            // Prepare email options
            const mailOptions = {
                from: `"${emailConfig.from.name}" <${smtpConfig.user || 'hossamsharif1990@gmail.com'}>`,
                to: emailData.to.join(', '),
                subject: emailData.subject,
                html: emailData.html,
                text: emailData.text || emailData.html.replace(/<[^>]*>/g, '')
            };

            // Send the email
            const info = await transporter.sendMail(mailOptions);
            console.log('✅ Email sent successfully via Gmail/Nodemailer');
            console.log('   Message ID:', info.messageId);
            console.log('   Accepted recipients:', info.accepted);

            return true;

        } catch (error: any) {
            console.error('❌ Error sending email:', error);
            return false;
        }
    }

    /**
     * Send email to all admin users
     */
    static async sendToAdmins(subject: string, html: string, text?: string): Promise<void> {
        try {
            const db = admin.firestore();

            // Get all active admins with email addresses
            const adminsSnapshot = await db.collection('users')
                .where('role', '==', 'admin')
                .where('isActive', '==', true)
                .get();

            const adminEmails: string[] = [];

            adminsSnapshot.docs.forEach(doc => {
                const user = doc.data();
                if (user.email) {
                    // Check if user has email notifications enabled (default: true)
                    const emailNotificationsEnabled = user.emailNotifications !== false;
                    if (emailNotificationsEnabled) {
                        adminEmails.push(user.email);
                    }
                }
            });

            if (adminEmails.length === 0) {
                console.log('⚠️ No admin users with email addresses found');
                return;
            }

            console.log(`📤 Sending email to ${adminEmails.length} admin(s)`);

            await this.sendEmail({
                to: adminEmails,
                subject,
                html,
                text
            });
        } catch (error: any) {
            console.error('❌ Error sending email to admins:', error);
        }
    }

    /**
     * Send transaction notification email
     */
    static async sendTransactionEmail(
        type: 'created' | 'updated' | 'deleted',
        data: {
            userName: string;
            shopName: string;
            transactionType: string;
            amount: number;
            description?: string;
            date: string;
        }
    ): Promise<void> {
        try {
            const template = emailConfig.templates.transaction[type];

            const appUrl = process.env.APP_URL || 'https://vavidiaapp.web.app';

            const variables = {
                ...data,
                appUrl
            };

            const subject = this.formatTemplate(template.subject, variables);
            const html = this.formatTemplate(template.body, variables);

            await this.sendToAdmins(subject, html);
        } catch (error: any) {
            console.error(`❌ Error sending ${type} transaction email:`, error);
        }
    }
}
