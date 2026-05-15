import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const baseTemplate = (content: string) => `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body { background:#1E1B4B; margin:0; padding:0; font-family:'Open Sans',Arial,sans-serif; color:#C7D2FE; }
  .wrapper { max-width:600px; margin:0 auto; padding:40px 20px; }
  .logo { font-size:24px; font-weight:900; margin-bottom:30px; }
  .logo span:first-child { color:#E0E7FF; }
  .logo span:last-child { color:#F87171; }
  .card { background:#252272; border:1px solid #312E81; border-radius:16px; padding:32px; }
  h1 { color:#E0E7FF; font-size:22px; margin:0 0 16px; }
  p { color:#C7D2FE; line-height:1.6; margin:0 0 16px; }
  .btn { display:inline-block; background:#F87171; color:#fff; padding:12px 28px; border-radius:8px; text-decoration:none; font-weight:700; margin-top:8px; }
  .divider { border-top:1px solid #312E81; margin:24px 0; }
  .muted { color:#818CF8; font-size:13px; }
  .footer { color:#6366F1; font-size:12px; text-align:center; margin-top:24px; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="logo"><span>NUCLEAR</span><span>VPS</span></div>
  <div class="card">
    ${content}
  </div>
  <p class="footer">© ${new Date().getFullYear()} Nuclear VPS. All rights reserved.<br>
  This email was sent to you because you have an account with Nuclear VPS.</p>
</div>
</body>
</html>
`;

export const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'Nuclear VPS <noreply@Nuclear VPS.com>',
      to,
      subject,
      html,
    });
    logger.info(`Email sent to ${to}: ${subject}`);
  } catch (err) {
    logger.error(`Failed to send email to ${to}:`, err);
    throw err;
  }
};

export const sendWelcomeEmail = (to: string, firstName: string) =>
  sendEmail(
    to,
    'Welcome to Nuclear VPS!',
    baseTemplate(`
      <h1>Welcome, ${firstName}! 🎉</h1>
      <p>Your Nuclear VPS account is ready. You can now order high-performance trading VPS services optimized for Forex and algorithmic trading.</p>
      <div class="divider"></div>
      <p>Get started by choosing your perfect plan:</p>
      <a href="${process.env.WEB_URL}/dashboard/order" class="btn">Order Your VPS</a>
      <div class="divider"></div>
      <p class="muted">Questions? Our support team is available 24/7.</p>
    `)
  );

export const sendVerificationEmail = (to: string, firstName: string, token: string) =>
  sendEmail(
    to,
    'Verify Your Email Address',
    baseTemplate(`
      <h1>Verify Your Email</h1>
      <p>Hi ${firstName}, please verify your email address to complete your registration.</p>
      <a href="${process.env.WEB_URL}/verify-email/${token}" class="btn">Verify Email</a>
      <div class="divider"></div>
      <p class="muted">This link expires in 24 hours. If you didn't create an account, you can ignore this email.</p>
    `)
  );

export const sendPasswordResetEmail = (to: string, firstName: string, token: string) =>
  sendEmail(
    to,
    'Reset Your Password',
    baseTemplate(`
      <h1>Password Reset</h1>
      <p>Hi ${firstName}, we received a request to reset your password.</p>
      <a href="${process.env.WEB_URL}/reset-password/${token}" class="btn">Reset Password</a>
      <div class="divider"></div>
      <p class="muted">This link expires in 1 hour. If you didn't request a password reset, you can ignore this email.</p>
    `)
  );

export const sendOrderConfirmationEmail = (
  to: string,
  firstName: string,
  data: {
    invoiceNumber: string;
    planName: string;
    amount: number;
    ipAddress: string;
    username: string;
    password: string;
    location: string;
  }
) =>
  sendEmail(
    to,
    `Order Confirmed - ${data.invoiceNumber}`,
    baseTemplate(`
      <h1>Your VPS is Ready!</h1>
      <p>Hi ${firstName}, your order has been confirmed and your VPS is now active.</p>
      <div class="divider"></div>
      <p><strong style="color:#E0E7FF">Plan:</strong> ${data.planName}</p>
      <p><strong style="color:#E0E7FF">Location:</strong> ${data.location}</p>
      <p><strong style="color:#E0E7FF">IP Address:</strong> <span style="font-family:monospace;color:#F87171">${data.ipAddress}</span></p>
      <p><strong style="color:#E0E7FF">Username:</strong> <span style="font-family:monospace">${data.username}</span></p>
      <p><strong style="color:#E0E7FF">Password:</strong> <span style="font-family:monospace;color:#F87171">${data.password}</span></p>
      <div class="divider"></div>
      <p>Connect via Remote Desktop (RDP). See our <a href="${process.env.WEB_URL}/knowledgebase" style="color:#F87171">Knowledgebase</a> for setup guides.</p>
      <p><strong style="color:#E0E7FF">Invoice:</strong> ${data.invoiceNumber} — $${data.amount}</p>
      <a href="${process.env.WEB_URL}/dashboard/services" class="btn">View My VPS</a>
    `)
  );

export const sendInvoiceEmail = (
  to: string,
  firstName: string,
  invoiceNumber: string,
  amount: number,
  dueDate: string
) =>
  sendEmail(
    to,
    `Invoice ${invoiceNumber} - $${amount}`,
    baseTemplate(`
      <h1>New Invoice</h1>
      <p>Hi ${firstName}, a new invoice has been generated for your account.</p>
      <div class="divider"></div>
      <p><strong style="color:#E0E7FF">Invoice Number:</strong> ${invoiceNumber}</p>
      <p><strong style="color:#E0E7FF">Amount:</strong> <span style="color:#F87171">$${amount}</span></p>
      <p><strong style="color:#E0E7FF">Due Date:</strong> ${dueDate}</p>
      <div class="divider"></div>
      <a href="${process.env.WEB_URL}/dashboard/billing" class="btn">Pay Now</a>
    `)
  );

export const sendTicketReplyEmail = (
  to: string,
  firstName: string,
  ticketNumber: string,
  subject: string
) =>
  sendEmail(
    to,
    `New Reply on Ticket ${ticketNumber}`,
    baseTemplate(`
      <h1>New Reply on Your Ticket</h1>
      <p>Hi ${firstName}, our team has replied to your support ticket.</p>
      <div class="divider"></div>
      <p><strong style="color:#E0E7FF">Ticket:</strong> ${ticketNumber}</p>
      <p><strong style="color:#E0E7FF">Subject:</strong> ${subject}</p>
      <div class="divider"></div>
      <a href="${process.env.WEB_URL}/dashboard/tickets" class="btn">View Reply</a>
    `)
  );

export const sendServiceSuspendedEmail = (to: string, firstName: string, planName: string) =>
  sendEmail(
    to,
    'Your VPS Has Been Suspended',
    baseTemplate(`
      <h1>Service Suspended</h1>
      <p>Hi ${firstName}, your <strong style="color:#F87171">${planName}</strong> VPS has been suspended due to an overdue payment.</p>
      <div class="divider"></div>
      <p>To reactivate your service, please pay your outstanding invoice immediately.</p>
      <a href="${process.env.WEB_URL}/dashboard/billing" class="btn">Pay Invoice</a>
      <div class="divider"></div>
      <p class="muted">Your data is preserved for 7 days. After that, the service will be terminated.</p>
    `)
  );

export const sendAffiliateCommissionEmail = (
  to: string,
  firstName: string,
  commission: number
) =>
  sendEmail(
    to,
    'You Earned an Affiliate Commission!',
    baseTemplate(`
      <h1>Commission Earned! 💰</h1>
      <p>Hi ${firstName}, you just earned an affiliate commission!</p>
      <div class="divider"></div>
      <p><strong style="color:#E0E7FF">Commission Amount:</strong> <span style="color:#F87171;font-size:24px;font-weight:900">$${commission.toFixed(2)}</span></p>
      <div class="divider"></div>
      <a href="${process.env.WEB_URL}/dashboard/affiliate" class="btn">View Affiliate Dashboard</a>
    `)
  );
