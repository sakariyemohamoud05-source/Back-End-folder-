import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

function logDebug(msg) {
  const logMsg = `[${new Date().toISOString()}] ${msg}\n`;
  console.log(msg);
  try {
    // Write to a log file in the project root
    fs.appendFileSync(path.join(process.cwd(), 'email-debug.log'), logMsg);
  } catch (e) {}
}

/**
 * Utility function to send an email using nodemailer (Gmail)
 * Credentials are loaded from .env by server.js at startup
 *
 * @param {Object} options
 * @param {string} options.email   - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.message - Plain text body
 * @param {string} [options.html]  - Optional HTML body
 */
export const sendEmail = async (options) => {
  logDebug(`--- ATTEMPTING TO SEND EMAIL TO: ${options.email} ---`);
  try {
    const EMAIL_USER = process.env.EMAIL_USER;
    const EMAIL_PASS = process.env.EMAIL_PASS;

    logDebug(`ENV Check -> EMAIL_USER: ${EMAIL_USER || 'UNDEFINED'}, EMAIL_PASS: ${EMAIL_PASS ? 'SET' : 'UNDEFINED'}`);

    // Validate credentials
    if (
      !EMAIL_USER ||
      !EMAIL_PASS ||
      EMAIL_USER === 'your_email@gmail.com' ||
      EMAIL_PASS === 'your_app_password_here'
    ) {
      logDebug('⚠️  [Email] Credentials missing or invalid in .env — email skipped.');
      return;
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    });

    const htmlBody = options.html || `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px; border-radius: 10px;">
        <div style="background: linear-gradient(135deg, #c0392b, #e74c3c); padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🩸 LifeLink Hub</h1>
          <p style="color: rgba(255,255,255,0.85); margin: 5px 0 0;">Blood Donation System</p>
        </div>
        <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
          <h2 style="color: #c0392b; margin-top: 0;">${options.subject.replace('LifeLink Hub: ', '')}</h2>
          <p style="color: #333; line-height: 1.8; white-space: pre-line;">${options.message}</p>
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
            <p style="color: #999; font-size: 12px;">This is an automated message from LifeLink Hub Blood Donation System.</p>
          </div>
        </div>
      </div>
    `;

    const mailOptions = {
      from: `LifeLink Hub <${EMAIL_USER}>`,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: htmlBody,
    };

    logDebug(`Calling transporter.sendMail for ${options.email}...`);
    const info = await transporter.sendMail(mailOptions);
    logDebug(`✅ Email successfully sent to ${options.email} — ID: ${info.messageId}`);
  } catch (error) {
    logDebug(`❌ Failed to send email to ${options.email}: ${error.message}`);
  }
};
