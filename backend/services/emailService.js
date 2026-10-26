// services/emailService.js — Nodemailer email service with mock mode for development
const nodemailer = require('nodemailer');
const EmailLog = require('../models/EmailLog');

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter;
};

/**
 * Send an email (or mock it in dev mode).
 * @param {Object} options
 * @param {string} options.to
 * @param {string} options.toName
 * @param {string} options.subject
 * @param {string} options.html
 * @param {string} options.type  — EmailLog type enum
 * @param {ObjectId} options.relatedIntern
 * @param {ObjectId} options.relatedTask
 * @param {ObjectId} options.relatedMeeting
 * @returns {Promise<EmailLog>}
 */
exports.sendEmail = async ({
  to,
  toName = '',
  subject,
  html,
  type = 'other',
  relatedIntern,
  relatedTask,
  relatedMeeting,
}) => {
  const isMock = process.env.MOCK_EMAIL === 'true';

  const logEntry = await EmailLog.create({
    to,
    toName,
    subject,
    type,
    relatedIntern,
    relatedTask,
    relatedMeeting,
    isMock,
    status: 'queued',
  });

  if (isMock) {
    // In development mock mode: log to console, do NOT send
    console.log(`\n📧 [MOCK EMAIL] ─────────────────────────────────`);
    console.log(`   To     : ${toName} <${to}>`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Type   : ${type}`);
    console.log(`   Body preview: ${html.replace(/<[^>]*>/g, '').slice(0, 200)}...`);
    console.log(`─────────────────────────────────────────────────\n`);

    await EmailLog.findByIdAndUpdate(logEntry._id, {
      status: 'mock',
      sentAt: new Date(),
      messageId: `mock-${Date.now()}`,
    });

    return { ...logEntry.toObject(), status: 'mock' };
  }

  // Real send
  try {
    const info = await getTransporter().sendMail({
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
      to: toName ? `"${toName}" <${to}>` : to,
      subject,
      html,
    });

    await EmailLog.findByIdAndUpdate(logEntry._id, {
      status: 'sent',
      sentAt: new Date(),
      messageId: info.messageId,
    });

    return { ...logEntry.toObject(), status: 'sent', messageId: info.messageId };
  } catch (err) {
    await EmailLog.findByIdAndUpdate(logEntry._id, {
      status: 'failed',
      errorMessage: err.message,
      retryCount: logEntry.retryCount + 1,
    });
    console.error(`[EMAIL ERROR] Failed to send to ${to}: ${err.message}`);
    return { ...logEntry.toObject(), status: 'failed', errorMessage: err.message };
  }
};

/**
 * Verify SMTP connection (for health check).
 */
exports.verifyConnection = async () => {
  if (process.env.MOCK_EMAIL === 'true') return { connected: true, mock: true };
  try {
    await getTransporter().verify();
    return { connected: true, mock: false };
  } catch (err) {
    return { connected: false, mock: false, error: err.message };
  }
};
