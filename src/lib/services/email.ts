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

// Application Approved Email Template
function getApplicationApprovedEmailTemplate(
  firstName: string,
  dashboardUrl: string
): EmailTemplate {
  return {
    subject: "🎉 Congratulations! Your Professional Application is Approved",
    text: `Hello ${firstName},

Great news! Your application to become a Hug Harmony professional has been approved!

You can now:
- Set up your availability
- Start receiving booking requests
- Manage your professional profile

Get started here: ${dashboardUrl}

Welcome to the team!

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
  
  <div style="text-align: center; margin-bottom: 20px;">
    <span style="font-size: 48px;">🎉</span>
  </div>
  
  <h2 style="color: #333; text-align: center;">Congratulations, ${firstName}!</h2>
  
  <p style="text-align: center; font-size: 18px;">Your application to become a Hug Harmony professional has been <strong style="color: #10b981;">approved</strong>!</p>
  
  <div style="background-color: #f0fdf4; border: 1px solid #10b981; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <p style="margin: 0; color: #166534;"><strong>You can now:</strong></p>
    <ul style="color: #166534; margin: 10px 0;">
      <li>Set up your availability schedule</li>
      <li>Start receiving booking requests</li>
      <li>Manage your professional profile</li>
      <li>Connect with clients</li>
    </ul>
  </div>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="${dashboardUrl}" 
       style="background-color: #10b981; color: #fff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
      Go to Dashboard
    </a>
  </div>
  
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  
  <p style="text-align: center; color: #666;">Welcome to the team! We're excited to have you.</p>
  
  <p style="margin-top: 30px;">Warm hugs,<br>The Hug Harmony Team</p>
</body>
</html>`,
  };
}

// Application Rejected Email Template
function getApplicationRejectedEmailTemplate(
  firstName: string,
  reason: string | null,
  reapplyUrl: string
): EmailTemplate {
  const reasonText = reason
    ? `Reason: ${reason}`
    : "Unfortunately, your application did not meet our current requirements.";

  return {
    subject: "Update on Your Hug Harmony Professional Application",
    text: `Hello ${firstName},

Thank you for your interest in becoming a Hug Harmony professional.

After careful review, we regret to inform you that your application has not been approved at this time.

${reasonText}

You're welcome to reapply in the future: ${reapplyUrl}

If you have any questions, please don't hesitate to reach out to our support team.

Warm regards,
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
  
  <h2 style="color: #333;">Application Update</h2>
  
  <p>Hi ${firstName},</p>
  
  <p>Thank you for your interest in becoming a Hug Harmony professional.</p>
  
  <p>After careful review, we regret to inform you that your application has not been approved at this time.</p>
  
  ${
    reason
      ? `
  <div style="background-color: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 8px; margin: 20px 0;">
    <p style="margin: 0; color: #991b1b;"><strong>Feedback:</strong></p>
    <p style="margin: 10px 0 0 0; color: #991b1b;">${reason}</p>
  </div>
  `
      : ""
  }
  
  <p>This decision doesn't reflect on you personally. Our requirements change over time, and we encourage you to reapply in the future.</p>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="${reapplyUrl}" 
       style="background-color: #E7C4BB; color: #000; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
      Reapply Later
    </a>
  </div>
  
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  
  <p style="color: #666; font-size: 14px;">If you have any questions, please contact our support team.</p>
  
  <p style="margin-top: 30px;">Warm regards,<br>The Hug Harmony Team</p>
</body>
</html>`,
  };
}

// Appointment Booked Email (sent to client)
function getAppointmentBookedClientEmailTemplate(
  clientName: string,
  professionalName: string,
  date: string,
  time: string,
  duration: string,
  amount: string,
  venue: string,
  appointmentUrl: string
): EmailTemplate {
  return {
    subject: `✅ Appointment Confirmed with ${professionalName}`,
    text: `Hello ${clientName},

Your appointment has been confirmed!

Details:
- Professional: ${professionalName}
- Date: ${date}
- Time: ${time}
- Duration: ${duration}
- Amount: ${amount}
- Location: ${venue}

View your appointment: ${appointmentUrl}

We look forward to your session!

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
  
  <div style="text-align: center; margin-bottom: 20px;">
    <span style="font-size: 48px;">✅</span>
  </div>
  
  <h2 style="color: #333; text-align: center;">Appointment Confirmed!</h2>
  
  <p>Hi ${clientName},</p>
  
  <p>Great news! Your appointment has been confirmed.</p>
  
  <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
    <h3 style="margin-top: 0; color: #333;">Appointment Details</h3>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px 0; color: #666;">Professional:</td>
        <td style="padding: 8px 0; font-weight: bold;">${professionalName}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #666;">Date:</td>
        <td style="padding: 8px 0; font-weight: bold;">${date}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #666;">Time:</td>
        <td style="padding: 8px 0; font-weight: bold;">${time}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #666;">Duration:</td>
        <td style="padding: 8px 0; font-weight: bold;">${duration}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #666;">Location:</td>
        <td style="padding: 8px 0; font-weight: bold;">${venue}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #666;">Amount:</td>
        <td style="padding: 8px 0; font-weight: bold; color: #10b981;">${amount}</td>
      </tr>
    </table>
  </div>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="${appointmentUrl}" 
       style="background-color: #E7C4BB; color: #000; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
      View Appointment
    </a>
  </div>
  
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  
  <p style="color: #666; font-size: 14px;">Need to make changes? You can reschedule or cancel from your dashboard.</p>
  
  <p style="margin-top: 30px;">Warm hugs,<br>The Hug Harmony Team</p>
</body>
</html>`,
  };
}

// Appointment Booked Email (sent to professional)
function getAppointmentBookedProfessionalEmailTemplate(
  professionalName: string,
  clientName: string,
  date: string,
  time: string,
  duration: string,
  amount: string,
  venue: string,
  appointmentUrl: string
): EmailTemplate {
  return {
    subject: `📅 New Appointment: ${clientName} on ${date}`,
    text: `Hello ${professionalName},

You have a new appointment!

Details:
- Client: ${clientName}
- Date: ${date}
- Time: ${time}
- Duration: ${duration}
- Your earnings: ${amount}
- Location: ${venue}

View details: ${appointmentUrl}

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
  
  <div style="text-align: center; margin-bottom: 20px;">
    <span style="font-size: 48px;">📅</span>
  </div>
  
  <h2 style="color: #333; text-align: center;">New Appointment Booked!</h2>
  
  <p>Hi ${professionalName},</p>
  
  <p>Great news! A client has booked an appointment with you.</p>
  
  <div style="background-color: #f0fdf4; border: 1px solid #10b981; border-radius: 8px; padding: 20px; margin: 20px 0;">
    <h3 style="margin-top: 0; color: #166534;">Appointment Details</h3>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px 0; color: #166534;">Client:</td>
        <td style="padding: 8px 0; font-weight: bold; color: #166534;">${clientName}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #166534;">Date:</td>
        <td style="padding: 8px 0; font-weight: bold; color: #166534;">${date}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #166534;">Time:</td>
        <td style="padding: 8px 0; font-weight: bold; color: #166534;">${time}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #166534;">Duration:</td>
        <td style="padding: 8px 0; font-weight: bold; color: #166534;">${duration}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #166534;">Location:</td>
        <td style="padding: 8px 0; font-weight: bold; color: #166534;">${venue}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #166534;">Your Earnings:</td>
        <td style="padding: 8px 0; font-weight: bold; color: #166534;">${amount}</td>
      </tr>
    </table>
  </div>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="${appointmentUrl}" 
       style="background-color: #10b981; color: #fff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
      View Appointment
    </a>
  </div>
  
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  
  <p style="margin-top: 30px;">Warm hugs,<br>The Hug Harmony Team</p>
</body>
</html>`,
  };
}

// Appointment Request Email (sent to professional)
function getAppointmentRequestEmailTemplate(
  professionalName: string,
  clientName: string,
  date: string,
  time: string,
  duration: string,
  amount: string,
  venue: string,
  conversationUrl: string
): EmailTemplate {
  return {
    subject: `🔔 New Appointment Request from ${clientName}`,
    text: `Hello ${professionalName},

You have a new appointment request!

Details:
- Client: ${clientName}
- Requested Date: ${date}
- Requested Time: ${time}
- Duration: ${duration}
- Amount: ${amount}
- Location: ${venue}

This request is for a time within 24 hours and requires your approval.

View and respond: ${conversationUrl}

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
  
  <div style="text-align: center; margin-bottom: 20px;">
    <span style="font-size: 48px;">🔔</span>
  </div>
  
  <h2 style="color: #333; text-align: center;">New Appointment Request</h2>
  
  <p>Hi ${professionalName},</p>
  
  <p>A client has requested an appointment with you. Since this is within 24 hours, it requires your approval.</p>
  
  <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0;">
    <h3 style="margin-top: 0; color: #92400e;">Request Details</h3>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px 0; color: #92400e;">Client:</td>
        <td style="padding: 8px 0; font-weight: bold; color: #92400e;">${clientName}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #92400e;">Date:</td>
        <td style="padding: 8px 0; font-weight: bold; color: #92400e;">${date}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #92400e;">Time:</td>
        <td style="padding: 8px 0; font-weight: bold; color: #92400e;">${time}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #92400e;">Duration:</td>
        <td style="padding: 8px 0; font-weight: bold; color: #92400e;">${duration}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #92400e;">Location:</td>
        <td style="padding: 8px 0; font-weight: bold; color: #92400e;">${venue}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #92400e;">Amount:</td>
        <td style="padding: 8px 0; font-weight: bold; color: #92400e;">${amount}</td>
      </tr>
    </table>
  </div>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="${conversationUrl}" 
       style="background-color: #f59e0b; color: #000; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
      View & Respond
    </a>
  </div>
  
  <p style="color: #666; font-size: 14px; text-align: center;">Please respond promptly as the requested time is approaching.</p>
  
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  
  <p style="margin-top: 30px;">Warm hugs,<br>The Hug Harmony Team</p>
</body>
</html>`,
  };
}

// Appointment Confirmed Email (sent to client when professional accepts)
function getAppointmentConfirmedEmailTemplate(
  clientName: string,
  professionalName: string,
  date: string,
  time: string,
  duration: string,
  amount: string,
  venue: string,
  appointmentUrl: string
): EmailTemplate {
  return {
    subject: `🎉 ${professionalName} accepted your appointment request!`,
    text: `Hello ${clientName},

Great news! ${professionalName} has accepted your appointment request.

Details:
- Professional: ${professionalName}
- Date: ${date}
- Time: ${time}
- Duration: ${duration}
- Amount: ${amount}
- Location: ${venue}

View your appointment: ${appointmentUrl}

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
  
  <div style="text-align: center; margin-bottom: 20px;">
    <span style="font-size: 48px;">🎉</span>
  </div>
  
  <h2 style="color: #333; text-align: center;">Request Accepted!</h2>
  
  <p>Hi ${clientName},</p>
  
  <p>Great news! <strong>${professionalName}</strong> has accepted your appointment request.</p>
  
  <div style="background-color: #f0fdf4; border: 1px solid #10b981; border-radius: 8px; padding: 20px; margin: 20px 0;">
    <h3 style="margin-top: 0; color: #166534;">Confirmed Details</h3>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px 0; color: #166534;">Professional:</td>
        <td style="padding: 8px 0; font-weight: bold; color: #166534;">${professionalName}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #166534;">Date:</td>
        <td style="padding: 8px 0; font-weight: bold; color: #166534;">${date}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #166534;">Time:</td>
        <td style="padding: 8px 0; font-weight: bold; color: #166534;">${time}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #166534;">Duration:</td>
        <td style="padding: 8px 0; font-weight: bold; color: #166534;">${duration}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #166534;">Location:</td>
        <td style="padding: 8px 0; font-weight: bold; color: #166534;">${venue}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #166534;">Amount:</td>
        <td style="padding: 8px 0; font-weight: bold; color: #166534;">${amount}</td>
      </tr>
    </table>
  </div>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="${appointmentUrl}" 
       style="background-color: #10b981; color: #fff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
      View Appointment
    </a>
  </div>
  
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  
  <p style="margin-top: 30px;">Warm hugs,<br>The Hug Harmony Team</p>
</body>
</html>`,
  };
}

// Appointment Rejected Email (sent to client when professional declines)
function getAppointmentRejectedEmailTemplate(
  clientName: string,
  professionalName: string,
  date: string,
  time: string,
  searchUrl: string
): EmailTemplate {
  return {
    subject: `Appointment request update from ${professionalName}`,
    text: `Hello ${clientName},

Unfortunately, ${professionalName} was unable to accept your appointment request for ${date} at ${time}.

Don't worry! There are many other amazing professionals available.

Find another professional: ${searchUrl}

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
  
  <h2 style="color: #333;">Appointment Request Update</h2>
  
  <p>Hi ${clientName},</p>
  
  <p>Unfortunately, <strong>${professionalName}</strong> was unable to accept your appointment request for:</p>
  
  <div style="background-color: #f8f9fa; border-radius: 8px; padding: 15px; margin: 20px 0;">
    <p style="margin: 0;"><strong>Date:</strong> ${date}</p>
    <p style="margin: 10px 0 0 0;"><strong>Time:</strong> ${time}</p>
  </div>
  
  <p>Don't worry! There are many other amazing professionals available who would love to help you.</p>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="${searchUrl}" 
       style="background-color: #E7C4BB; color: #000; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
      Find Another Professional
    </a>
  </div>
  
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  
  <p style="margin-top: 30px;">Warm hugs,<br>The Hug Harmony Team</p>
</body>
</html>`,
  };
}

// Appointment Cancelled Email
function getAppointmentCancelledEmailTemplate(
  recipientName: string,
  cancelledBy: string,
  otherPartyName: string,
  date: string,
  time: string,
  isRecipientProfessional: boolean
): EmailTemplate {
  const subject = `Appointment Cancelled: ${date}`;

  return {
    subject,
    text: `Hello ${recipientName},

The appointment on ${date} at ${time} with ${otherPartyName} has been cancelled by ${cancelledBy}.

${
  isRecipientProfessional
    ? "The time slot is now available for other bookings."
    : "You can book a new appointment at your convenience."
}

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
  
  <h2 style="color: #333;">Appointment Cancelled</h2>
  
  <p>Hi ${recipientName},</p>
  
  <p>The following appointment has been cancelled by ${cancelledBy}:</p>
  
  <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 15px; margin: 20px 0;">
    <p style="margin: 0; color: #991b1b;"><strong>With:</strong> ${otherPartyName}</p>
    <p style="margin: 10px 0 0 0; color: #991b1b;"><strong>Date:</strong> ${date}</p>
    <p style="margin: 10px 0 0 0; color: #991b1b;"><strong>Time:</strong> ${time}</p>
  </div>
  
  <p>${
    isRecipientProfessional
      ? "The time slot is now available for other bookings."
      : "You can book a new appointment at your convenience."
  }</p>
  
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  
  <p style="margin-top: 30px;">Warm hugs,<br>The Hug Harmony Team</p>
</body>
</html>`,
  };
}

// Appointment Reminder Email (24 hours before)
function getAppointmentReminderEmailTemplate(
  recipientName: string,
  otherPartyName: string,
  date: string,
  time: string,
  venue: string,
  appointmentUrl: string,
  isRecipientProfessional: boolean
): EmailTemplate {
  const roleLabel = isRecipientProfessional ? "client" : "professional";

  return {
    subject: `⏰ Reminder: Appointment tomorrow with ${otherPartyName}`,
    text: `Hello ${recipientName},

This is a friendly reminder about your appointment tomorrow!

Details:
- ${isRecipientProfessional ? "Client" : "Professional"}: ${otherPartyName}
- Date: ${date}
- Time: ${time}
- Location: ${venue}

View details: ${appointmentUrl}

We look forward to your session!

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
  
  <div style="text-align: center; margin-bottom: 20px;">
    <span style="font-size: 48px;">⏰</span>
  </div>
  
  <h2 style="color: #333; text-align: center;">Appointment Reminder</h2>
  
  <p>Hi ${recipientName},</p>
  
  <p>This is a friendly reminder about your appointment <strong>tomorrow</strong>!</p>
  
  <div style="background-color: #eff6ff; border: 1px solid #3b82f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
    <h3 style="margin-top: 0; color: #1e40af;">Appointment Details</h3>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px 0; color: #1e40af;">${isRecipientProfessional ? "Client" : "Professional"}:</td>
        <td style="padding: 8px 0; font-weight: bold; color: #1e40af;">${otherPartyName}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #1e40af;">Date:</td>
        <td style="padding: 8px 0; font-weight: bold; color: #1e40af;">${date}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #1e40af;">Time:</td>
        <td style="padding: 8px 0; font-weight: bold; color: #1e40af;">${time}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #1e40af;">Location:</td>
        <td style="padding: 8px 0; font-weight: bold; color: #1e40af;">${venue}</td>
      </tr>
    </table>
  </div>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="${appointmentUrl}" 
       style="background-color: #3b82f6; color: #fff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
      View Appointment
    </a>
  </div>
  
  <p style="color: #666; font-size: 14px; text-align: center;">Need to reschedule? Please do so as soon as possible.</p>
  
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  
  <p style="margin-top: 30px;">Warm hugs,<br>The Hug Harmony Team</p>
</body>
</html>`,
  };
}

// Appointment Rescheduled Email
function getAppointmentRescheduledEmailTemplate(
  recipientName: string,
  rescheduledBy: string,
  otherPartyName: string,
  oldDate: string,
  oldTime: string,
  newDate: string,
  newTime: string,
  appointmentUrl: string
): EmailTemplate {
  return {
    subject: `📅 Appointment Rescheduled: ${newDate}`,
    text: `Hello ${recipientName},

${rescheduledBy} has rescheduled your appointment.

Previous Time:
- Date: ${oldDate}
- Time: ${oldTime}

New Time:
- Date: ${newDate}
- Time: ${newTime}

View details: ${appointmentUrl}

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
  
  <div style="text-align: center; margin-bottom: 20px;">
    <span style="font-size: 48px;">📅</span>
  </div>
  
  <h2 style="color: #333; text-align: center;">Appointment Rescheduled</h2>
  
  <p>Hi ${recipientName},</p>
  
  <p><strong>${rescheduledBy}</strong> has rescheduled your appointment with <strong>${otherPartyName}</strong>.</p>
  
  <div style="display: flex; gap: 20px; margin: 20px 0;">
    <div style="flex: 1; background-color: #fef2f2; border-radius: 8px; padding: 15px;">
      <p style="margin: 0; color: #991b1b; font-weight: bold; text-decoration: line-through;">Previous Time</p>
      <p style="margin: 10px 0 0 0; color: #991b1b;">${oldDate}</p>
      <p style="margin: 5px 0 0 0; color: #991b1b;">${oldTime}</p>
    </div>
    <div style="flex: 1; background-color: #f0fdf4; border-radius: 8px; padding: 15px;">
      <p style="margin: 0; color: #166534; font-weight: bold;">New Time</p>
      <p style="margin: 10px 0 0 0; color: #166534;">${newDate}</p>
      <p style="margin: 5px 0 0 0; color: #166534;">${newTime}</p>
    </div>
  </div>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="${appointmentUrl}" 
       style="background-color: #E7C4BB; color: #000; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
      View Updated Appointment
    </a>
  </div>
  
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

export async function sendApplicationApprovedEmail(
  email: string,
  firstName: string
): Promise<void> {
  const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`;
  const template = getApplicationApprovedEmailTemplate(firstName, dashboardUrl);

  await getTransporter().sendMail({
    from: `"Hug Harmony" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: template.subject,
    text: template.text,
    html: template.html,
  });
}

export async function sendApplicationRejectedEmail(
  email: string,
  firstName: string,
  reason: string | null = null
): Promise<void> {
  const reapplyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/edit-profile/professional-application`;
  const template = getApplicationRejectedEmailTemplate(
    firstName,
    reason,
    reapplyUrl
  );

  await getTransporter().sendMail({
    from: `"Hug Harmony" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: template.subject,
    text: template.text,
    html: template.html,
  });
}

export async function sendAppointmentBookedEmails(
  clientEmail: string,
  clientName: string,
  professionalEmail: string,
  professionalName: string,
  date: string,
  time: string,
  duration: string,
  amount: string,
  venue: string,
  appointmentId: string
): Promise<void> {
  const appointmentUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/appointments`;

  // Send to client
  const clientTemplate = getAppointmentBookedClientEmailTemplate(
    clientName,
    professionalName,
    date,
    time,
    duration,
    amount,
    venue,
    appointmentUrl
  );

  // Send to professional
  const professionalTemplate = getAppointmentBookedProfessionalEmailTemplate(
    professionalName,
    clientName,
    date,
    time,
    duration,
    amount,
    venue,
    appointmentUrl
  );

  await Promise.all([
    getTransporter().sendMail({
      from: `"Hug Harmony" <${process.env.GMAIL_USER}>`,
      to: clientEmail,
      subject: clientTemplate.subject,
      text: clientTemplate.text,
      html: clientTemplate.html,
    }),
    getTransporter().sendMail({
      from: `"Hug Harmony" <${process.env.GMAIL_USER}>`,
      to: professionalEmail,
      subject: professionalTemplate.subject,
      text: professionalTemplate.text,
      html: professionalTemplate.html,
    }),
  ]);
}

export async function sendAppointmentRequestEmail(
  professionalEmail: string,
  professionalName: string,
  clientName: string,
  date: string,
  time: string,
  duration: string,
  amount: string,
  venue: string,
  conversationId: string
): Promise<void> {
  const conversationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/messaging/${conversationId}`;

  const template = getAppointmentRequestEmailTemplate(
    professionalName,
    clientName,
    date,
    time,
    duration,
    amount,
    venue,
    conversationUrl
  );

  await getTransporter().sendMail({
    from: `"Hug Harmony" <${process.env.GMAIL_USER}>`,
    to: professionalEmail,
    subject: template.subject,
    text: template.text,
    html: template.html,
  });
}

export async function sendAppointmentConfirmedEmail(
  clientEmail: string,
  clientName: string,
  professionalName: string,
  date: string,
  time: string,
  duration: string,
  amount: string,
  venue: string
): Promise<void> {
  const appointmentUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/appointments`;

  const template = getAppointmentConfirmedEmailTemplate(
    clientName,
    professionalName,
    date,
    time,
    duration,
    amount,
    venue,
    appointmentUrl
  );

  await getTransporter().sendMail({
    from: `"Hug Harmony" <${process.env.GMAIL_USER}>`,
    to: clientEmail,
    subject: template.subject,
    text: template.text,
    html: template.html,
  });
}

export async function sendAppointmentRejectedEmail(
  clientEmail: string,
  clientName: string,
  professionalName: string,
  date: string,
  time: string
): Promise<void> {
  const searchUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/professionals`;

  const template = getAppointmentRejectedEmailTemplate(
    clientName,
    professionalName,
    date,
    time,
    searchUrl
  );

  await getTransporter().sendMail({
    from: `"Hug Harmony" <${process.env.GMAIL_USER}>`,
    to: clientEmail,
    subject: template.subject,
    text: template.text,
    html: template.html,
  });
}

export async function sendAppointmentCancelledEmail(
  recipientEmail: string,
  recipientName: string,
  cancelledBy: string,
  otherPartyName: string,
  date: string,
  time: string,
  isRecipientProfessional: boolean
): Promise<void> {
  const template = getAppointmentCancelledEmailTemplate(
    recipientName,
    cancelledBy,
    otherPartyName,
    date,
    time,
    isRecipientProfessional
  );

  await getTransporter().sendMail({
    from: `"Hug Harmony" <${process.env.GMAIL_USER}>`,
    to: recipientEmail,
    subject: template.subject,
    text: template.text,
    html: template.html,
  });
}

export async function sendAppointmentReminderEmail(
  recipientEmail: string,
  recipientName: string,
  otherPartyName: string,
  date: string,
  time: string,
  venue: string,
  isRecipientProfessional: boolean
): Promise<void> {
  const appointmentUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/appointments`;

  const template = getAppointmentReminderEmailTemplate(
    recipientName,
    otherPartyName,
    date,
    time,
    venue,
    appointmentUrl,
    isRecipientProfessional
  );

  await getTransporter().sendMail({
    from: `"Hug Harmony" <${process.env.GMAIL_USER}>`,
    to: recipientEmail,
    subject: template.subject,
    text: template.text,
    html: template.html,
  });
}

export async function sendAppointmentRescheduledEmail(
  recipientEmail: string,
  recipientName: string,
  rescheduledBy: string,
  otherPartyName: string,
  oldDate: string,
  oldTime: string,
  newDate: string,
  newTime: string
): Promise<void> {
  const appointmentUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/appointments`;

  const template = getAppointmentRescheduledEmailTemplate(
    recipientName,
    rescheduledBy,
    otherPartyName,
    oldDate,
    oldTime,
    newDate,
    newTime,
    appointmentUrl
  );

  await getTransporter().sendMail({
    from: `"Hug Harmony" <${process.env.GMAIL_USER}>`,
    to: recipientEmail,
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
