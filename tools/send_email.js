/**
 * WAT Tool: send_email
 * Usage: node tools/send_email.js <to> <subject> <templateName> '<jsonData>'
 * Templates: welcome, verify_email, password_reset, order_confirmation, invoice_generated,
 *            payment_received, service_suspended, ticket_reply, affiliate_commission
 */

import nodemailer from 'nodemailer';
import { createRequire } from 'module';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createLogger, transports, format } from 'winston';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const logger = createLogger({
  level: 'info',
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
});

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const BASE_STYLES = `
  body { margin: 0; padding: 0; background-color: #0a0d1a; font-family: 'Open Sans', Arial, sans-serif; color: #C7D2FE; }
  .container { max-width: 600px; margin: 0 auto; background-color: #1E1B4B; border: 1px solid #312E81; border-radius: 16px; overflow: hidden; }
  .header { background-color: #13114A; padding: 32px 40px; border-bottom: 1px solid #312E81; }
  .logo-dip { font-size: 28px; font-weight: 900; color: #E0E7FF; }
  .logo-gate { font-size: 28px; font-weight: 900; color: #F87171; }
  .body { padding: 40px; }
  h1 { color: #E0E7FF; font-size: 24px; font-weight: 900; margin: 0 0 16px; }
  p { color: #C7D2FE; font-size: 15px; line-height: 1.7; margin: 0 0 16px; }
  .btn { display: inline-block; background-color: #F87171; color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 900; font-size: 15px; margin: 8px 0; }
  .info-box { background-color: #13114A; border: 1px solid #312E81; border-radius: 12px; padding: 20px 24px; margin: 20px 0; }
  .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #312E81; }
  .info-row:last-child { border-bottom: none; }
  .label { color: #818CF8; font-size: 13px; }
  .value { color: #E0E7FF; font-weight: 700; font-size: 13px; }
  .footer { background-color: #0D0B33; padding: 24px 40px; text-align: center; border-top: 1px solid #312E81; }
  .footer p { color: #6366F1; font-size: 12px; margin: 0; }
`;

const TEMPLATES = {
  welcome: (d) => ({
    subject: `Welcome to Dipgate, ${d.firstName}!`,
    html: `<html><head><style>${BASE_STYLES}</style></head><body>
      <div style="padding:20px 0;background:#0a0d1a;">
      <div class="container">
        <div class="header"><span class="logo-dip">DIP</span><span class="logo-gate">GATE</span></div>
        <div class="body">
          <h1>Welcome aboard, ${d.firstName}! 🚀</h1>
          <p>Your Dipgate account is ready. You're one step away from ultra-low latency trading.</p>
          <p>Here's what you can do right now:</p>
          <div class="info-box">
            <div class="info-row"><span class="label">✅ Choose a Plan</span><span class="value">From $24.90/mo</span></div>
            <div class="info-row"><span class="label">✅ Deploy in Seconds</span><span class="value">London or New York</span></div>
            <div class="info-row"><span class="label">✅ 7-Day Money Back</span><span class="value">Risk free</span></div>
          </div>
          <a href="${d.dashboardUrl || process.env.WEB_URL + '/dashboard'}" class="btn">Go to Dashboard</a>
          <p style="color:#818CF8;font-size:13px;margin-top:24px;">Questions? Reply to this email or open a support ticket.</p>
        </div>
        <div class="footer"><p>© ${new Date().getFullYear()} Dipgate · All rights reserved</p></div>
      </div></div>
    </body></html>`,
  }),

  verify_email: (d) => ({
    subject: 'Verify your Dipgate email address',
    html: `<html><head><style>${BASE_STYLES}</style></head><body>
      <div style="padding:20px 0;background:#0a0d1a;">
      <div class="container">
        <div class="header"><span class="logo-dip">DIP</span><span class="logo-gate">GATE</span></div>
        <div class="body">
          <h1>Verify your email</h1>
          <p>Hi ${d.firstName}, please confirm your email address to complete your registration.</p>
          <a href="${d.verifyUrl}" class="btn">Verify Email Address</a>
          <p style="color:#818CF8;font-size:13px;margin-top:24px;">This link expires in 24 hours. If you didn't sign up, you can safely ignore this email.</p>
        </div>
        <div class="footer"><p>© ${new Date().getFullYear()} Dipgate · All rights reserved</p></div>
      </div></div>
    </body></html>`,
  }),

  password_reset: (d) => ({
    subject: 'Reset your Dipgate password',
    html: `<html><head><style>${BASE_STYLES}</style></head><body>
      <div style="padding:20px 0;background:#0a0d1a;">
      <div class="container">
        <div class="header"><span class="logo-dip">DIP</span><span class="logo-gate">GATE</span></div>
        <div class="body">
          <h1>Password Reset Request</h1>
          <p>Hi ${d.firstName}, we received a request to reset your password.</p>
          <a href="${d.resetUrl}" class="btn">Reset My Password</a>
          <p style="color:#818CF8;font-size:13px;margin-top:24px;">This link expires in 1 hour. If you didn't request this, no action is needed.</p>
        </div>
        <div class="footer"><p>© ${new Date().getFullYear()} Dipgate · All rights reserved</p></div>
      </div></div>
    </body></html>`,
  }),

  order_confirmation: (d) => ({
    subject: `Order Confirmed — ${d.planName} VPS`,
    html: `<html><head><style>${BASE_STYLES}</style></head><body>
      <div style="padding:20px 0;background:#0a0d1a;">
      <div class="container">
        <div class="header"><span class="logo-dip">DIP</span><span class="logo-gate">GATE</span></div>
        <div class="body">
          <h1>Your VPS is Ready! 🎉</h1>
          <p>Hi ${d.firstName}, your order has been processed and your VPS is now active.</p>
          <div class="info-box">
            <div class="info-row"><span class="label">Plan</span><span class="value">${d.planName}</span></div>
            <div class="info-row"><span class="label">Location</span><span class="value">${d.location}</span></div>
            <div class="info-row"><span class="label">IP Address</span><span class="value" style="font-family:monospace">${d.ipAddress}</span></div>
            <div class="info-row"><span class="label">Username</span><span class="value" style="font-family:monospace">${d.username || 'Administrator'}</span></div>
            <div class="info-row"><span class="label">Password</span><span class="value" style="font-family:monospace">${d.password}</span></div>
            <div class="info-row"><span class="label">OS</span><span class="value">${d.os}</span></div>
            <div class="info-row"><span class="label">Invoice</span><span class="value">${d.invoiceNumber}</span></div>
          </div>
          <p><strong style="color:#E0E7FF;">To connect:</strong> Open Remote Desktop (RDP) and enter the IP address above with the credentials provided.</p>
          <a href="${process.env.WEB_URL}/dashboard/services" class="btn">View My Services</a>
        </div>
        <div class="footer"><p>© ${new Date().getFullYear()} Dipgate · All rights reserved</p></div>
      </div></div>
    </body></html>`,
  }),

  invoice_generated: (d) => ({
    subject: `Invoice ${d.invoiceNumber} — $${d.amount}`,
    html: `<html><head><style>${BASE_STYLES}</style></head><body>
      <div style="padding:20px 0;background:#0a0d1a;">
      <div class="container">
        <div class="header"><span class="logo-dip">DIP</span><span class="logo-gate">GATE</span></div>
        <div class="body">
          <h1>Invoice Generated</h1>
          <p>Hi ${d.firstName}, your invoice is ready for payment.</p>
          <div class="info-box">
            <div class="info-row"><span class="label">Invoice #</span><span class="value">${d.invoiceNumber}</span></div>
            <div class="info-row"><span class="label">Amount</span><span class="value" style="color:#F87171">$${d.amount}</span></div>
            <div class="info-row"><span class="label">Due Date</span><span class="value">${d.dueDate}</span></div>
            <div class="info-row"><span class="label">Description</span><span class="value">${d.description || 'VPS Hosting'}</span></div>
          </div>
          <a href="${process.env.WEB_URL}/dashboard/billing" class="btn">Pay Now</a>
        </div>
        <div class="footer"><p>© ${new Date().getFullYear()} Dipgate · All rights reserved</p></div>
      </div></div>
    </body></html>`,
  }),

  payment_received: (d) => ({
    subject: `Payment Received — $${d.amount}`,
    html: `<html><head><style>${BASE_STYLES}</style></head><body>
      <div style="padding:20px 0;background:#0a0d1a;">
      <div class="container">
        <div class="header"><span class="logo-dip">DIP</span><span class="logo-gate">GATE</span></div>
        <div class="body">
          <h1>Payment Confirmed ✅</h1>
          <p>Hi ${d.firstName}, we've received your payment of <strong style="color:#F87171">$${d.amount}</strong>.</p>
          <div class="info-box">
            <div class="info-row"><span class="label">Invoice</span><span class="value">${d.invoiceNumber}</span></div>
            <div class="info-row"><span class="label">Amount Paid</span><span class="value" style="color:#F87171">$${d.amount}</span></div>
            <div class="info-row"><span class="label">Method</span><span class="value">${d.paymentMethod}</span></div>
          </div>
          <a href="${process.env.WEB_URL}/dashboard/billing" class="btn">View Invoices</a>
        </div>
        <div class="footer"><p>© ${new Date().getFullYear()} Dipgate · All rights reserved</p></div>
      </div></div>
    </body></html>`,
  }),

  service_suspended: (d) => ({
    subject: `Action Required: Service Suspended`,
    html: `<html><head><style>${BASE_STYLES}</style></head><body>
      <div style="padding:20px 0;background:#0a0d1a;">
      <div class="container">
        <div class="header"><span class="logo-dip">DIP</span><span class="logo-gate">GATE</span></div>
        <div class="body">
          <h1>Your Service Has Been Suspended</h1>
          <p>Hi ${d.firstName}, your <strong style="color:#E0E7FF">${d.planName}</strong> VPS has been suspended due to an overdue payment.</p>
          <p>To restore your service, please pay the outstanding invoice immediately.</p>
          <a href="${process.env.WEB_URL}/dashboard/billing" class="btn">Pay Now</a>
          <p style="color:#818CF8;font-size:13px;margin-top:24px;">Your data is preserved for 7 days. After that, the service may be terminated.</p>
        </div>
        <div class="footer"><p>© ${new Date().getFullYear()} Dipgate · All rights reserved</p></div>
      </div></div>
    </body></html>`,
  }),

  ticket_reply: (d) => ({
    subject: `Re: ${d.subject} [Ticket #${d.ticketNumber}]`,
    html: `<html><head><style>${BASE_STYLES}</style></head><body>
      <div style="padding:20px 0;background:#0a0d1a;">
      <div class="container">
        <div class="header"><span class="logo-dip">DIP</span><span class="logo-gate">GATE</span></div>
        <div class="body">
          <h1>New Reply on Your Ticket</h1>
          <p>Hi ${d.firstName}, our support team has replied to your ticket.</p>
          <div class="info-box">
            <div class="info-row"><span class="label">Ticket</span><span class="value">#${d.ticketNumber}</span></div>
            <div class="info-row"><span class="label">Subject</span><span class="value">${d.subject}</span></div>
          </div>
          <div class="info-box">
            <p style="margin:0;font-size:14px;line-height:1.7">${d.message}</p>
          </div>
          <a href="${process.env.WEB_URL}/dashboard/tickets/${d.ticketId}" class="btn">View Ticket</a>
        </div>
        <div class="footer"><p>© ${new Date().getFullYear()} Dipgate · All rights reserved</p></div>
      </div></div>
    </body></html>`,
  }),

  affiliate_commission: (d) => ({
    subject: `You earned $${d.commission} in affiliate commission!`,
    html: `<html><head><style>${BASE_STYLES}</style></head><body>
      <div style="padding:20px 0;background:#0a0d1a;">
      <div class="container">
        <div class="header"><span class="logo-dip">DIP</span><span class="logo-gate">GATE</span></div>
        <div class="body">
          <h1>Commission Earned! 💰</h1>
          <p>Hi ${d.firstName}, one of your referrals made a payment and you've earned a commission.</p>
          <div class="info-box">
            <div class="info-row"><span class="label">Commission</span><span class="value" style="color:#F87171;font-size:20px">$${d.commission}</span></div>
            <div class="info-row"><span class="label">Commission Rate</span><span class="value">15%</span></div>
            <div class="info-row"><span class="label">Payment Amount</span><span class="value">$${d.paymentAmount}</span></div>
          </div>
          <a href="${process.env.WEB_URL}/dashboard/affiliate" class="btn">View Affiliate Dashboard</a>
        </div>
        <div class="footer"><p>© ${new Date().getFullYear()} Dipgate · All rights reserved</p></div>
      </div></div>
    </body></html>`,
  }),
};

async function sendEmail(to, subject, templateName, data) {
  const template = TEMPLATES[templateName];
  if (!template) throw new Error(`Unknown template: ${templateName}`);

  const { subject: tSubject, html } = template(data);
  const finalSubject = subject || tSubject;

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || `Dipgate <noreply@dipgate.com>`,
      to,
      subject: finalSubject,
      html,
    });
    logger.info('Email sent', { to, subject: finalSubject, messageId: info.messageId });
    return { success: true, messageId: info.messageId };
  } catch (err) {
    logger.error('Email failed', { to, subject: finalSubject, error: err.message });
    throw err;
  }
}

// CLI usage
const [,, to, subject, templateName, dataJson] = process.argv;
if (to && templateName) {
  const data = dataJson ? JSON.parse(dataJson) : {};
  sendEmail(to, subject, templateName, data)
    .then(r => { console.log(JSON.stringify(r)); process.exit(0); })
    .catch(e => { console.error(e.message); process.exit(1); });
}

export { sendEmail };
