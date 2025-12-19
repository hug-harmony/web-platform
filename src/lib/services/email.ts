// lib/services/email.ts

import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

// Singleton transporter instance
let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: process.env.GMAIL_USER,
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
    },
  });

  return transporter;
}

// Email template interfaces
interface EmailTemplate {
  subject: string;
  text: string;
  html: string;
}

// Verification email template
function getVerificationEmailTemplate(
  firstName: string,
  verificationUrl: string
): EmailTemplate {
  return {
    subject: "Verify your Hug Harmony account",
    text: `Hello ${firstName},

Welcome to Hug Harmony! Please verify your email to get started.

Click here to verify: ${verificationUrl}

This link expires in 24 hours.

If you didn't create this account, you can safely ignore this email.

Warm hugs,
The Hug Harmony Team`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #E7C4BB; margin: 0;">Hug Harmony</h1>
  </div>
  
  <h2 style="color: #333;">Welcome, ${firstName}!</h2>
  
  <p>Thank you for joining Hug Harmony. To complete your registration and start exploring, please verify your email address.</p>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="${verificationUrl}" 
       style="background-color: #E7C4BB; color: #000; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
      Verify Email Address
    </a>
  </div>
  
  <p style="color: #666; font-size: 14px;">This link will expire in 24 hours.</p>
  
  <p style="color: #666; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:</p>
  <p style="color: #666; font-size: 12px; word-break: break-all;">${verificationUrl}</p>
  
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  
  <p style="color: #999; font-size: 12px;">If you didn't create an account with Hug Harmony, you can safely ignore this email.</p>
  
  <p style="margin-top: 30px;">Warm hugs,<br>The Hug Harmony Team</p>
</body>
</html>`,
  };
}

// Welcome email template (sent after verification)
function getWelcomeEmailTemplate(
  firstName: string,
  dashboardUrl: string
): EmailTemplate {
  return {
    subject: `Welcome to Hug Harmony, ${firstName}!`,
    text: `Hello ${firstName},

Your email has been verified! Welcome to the Hug Harmony community.

You can now access all features and start your journey here:
${dashboardUrl}

We're thrilled to have you with us!

Warm hugs,
The Hug Harmony Team`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #E7C4BB; margin: 0;">Hug Harmony</h1>
  </div>
  
  <h2 style="color: #333;">🎉 You're all set, ${firstName}!</h2>
  
  <p>Your email has been verified and your account is now fully activated. Welcome to the Hug Harmony community!</p>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="${dashboardUrl}" 
       style="background-color: #E7C4BB; color: #000; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
      Explore Your Dashboard
    </a>
  </div>
  
  <p>Here's what you can do now:</p>
  <ul style="color: #555;">
    <li>Complete your profile</li>
    <li>Browse and connect with professionals</li>
    <li>Book your first appointment</li>
    <li>Join the community forums</li>
  </ul>
  
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  
  <p style="margin-top: 30px;">Warm hugs,<br>The Hug Harmony Team</p>
</body>
</html>`,
  };
}

// Password reset email template
function getPasswordResetEmailTemplate(
  firstName: string,
  resetUrl: string
): EmailTemplate {
  return {
    subject: "Reset your Hug Harmony password",
    text: `Hello ${firstName},

We received a request to reset your password. Click the link below to create a new password:

${resetUrl}

This link expires in 1 hour.

If you didn't request this, you can safely ignore this email. Your password won't be changed.

Warm hugs,
The Hug Harmony Team`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #E7C4BB; margin: 0;">Hug Harmony</h1>
  </div>
  
  <h2 style="color: #333;">Password Reset Request</h2>
  
  <p>Hi ${firstName},</p>
  
  <p>We received a request to reset your password. Click the button below to create a new password:</p>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="${resetUrl}" 
       style="background-color: #E7C4BB; color: #000; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
      Reset Password
    </a>
  </div>
  
  <p style="color: #666; font-size: 14px;">This link will expire in 1 hour.</p>
  
  <p style="color: #666; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:</p>
  <p style="color: #666; font-size: 12px; word-break: break-all;">${resetUrl}</p>
  
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  
  <p style="color: #999; font-size: 12px;">If you didn't request a password reset, you can safely ignore this email. Your password won't be changed.</p>
  
  <p style="margin-top: 30px;">Warm hugs,<br>The Hug Harmony Team</p>
</body>
</html>`,
  };
}

// Security alert email template
function getSecurityAlertEmailTemplate(
  firstName: string,
  eventType: string,
  details: string,
  timestamp: Date
): EmailTemplate {
  const formattedDate = timestamp.toLocaleString("en-US", {
    dateStyle: "full",
    timeStyle: "short",
  });

  return {
    subject: `Security Alert: ${eventType} - Hug Harmony`,
    text: `Hello ${firstName},

We detected the following activity on your Hug Harmony account:

${eventType}
${details}
Time: ${formattedDate}

If this was you, no action is needed. If you didn't perform this action, please secure your account immediately by changing your password.

Warm hugs,
The Hug Harmony Team`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #E7C4BB; margin: 0;">Hug Harmony</h1>
  </div>
  
  <h2 style="color: #333;">🔒 Security Alert</h2>
  
  <p>Hi ${firstName},</p>
  
  <p>We detected the following activity on your account:</p>
  
  <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
    <p style="margin: 0;"><strong>${eventType}</strong></p>
    <p style="margin: 10px 0 0 0; color: #666;">${details}</p>
    <p style="margin: 10px 0 0 0; color: #666; font-size: 14px;">Time: ${formattedDate}</p>
  </div>
  
  <p>If this was you, no action is needed.</p>
  
  <p style="color: #d32f2f;">If you didn't perform this action, please change your password immediately.</p>
  
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  
  <p style="margin-top: 30px;">Warm hugs,<br>The Hug Harmony Team</p>
</body>
</html>`,
  };
}

// Email sending functions
export async function sendVerificationEmail(
  email: string,
  token: string,
  firstName: string
): Promise<void> {
  const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`;
  const template = getVerificationEmailTemplate(firstName, verificationUrl);

  await getTransporter().sendMail({
    from: `"Hug Harmony" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: template.subject,
    text: template.text,
    html: template.html,
  });
}

export async function sendWelcomeEmail(
  email: string,
  firstName: string
): Promise<void> {
  const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`;
  const template = getWelcomeEmailTemplate(firstName, dashboardUrl);

  await getTransporter().sendMail({
    from: `"Hug Harmony" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: template.subject,
    text: template.text,
    html: template.html,
  });
}

export async function sendPasswordResetEmail(
  email: string,
  token: string,
  firstName: string
): Promise<void> {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password/${token}`;
  const template = getPasswordResetEmailTemplate(firstName, resetUrl);

  await getTransporter().sendMail({
    from: `"Hug Harmony" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: template.subject,
    text: template.text,
    html: template.html,
  });
}

export async function sendSecurityAlertEmail(
  email: string,
  firstName: string,
  eventType: string,
  details: string
): Promise<void> {
  const template = getSecurityAlertEmailTemplate(
    firstName,
    eventType,
    details,
    new Date()
  );

  await getTransporter().sendMail({
    from: `"Hug Harmony Security" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: template.subject,
    text: template.text,
    html: template.html,
  });
}

// Verify transporter connection (useful for health checks)
export async function verifyEmailConnection(): Promise<boolean> {
  try {
    await getTransporter().verify();
    return true;
  } catch (error) {
    console.error("Email transporter verification failed:", error);
    return false;
  }
}
