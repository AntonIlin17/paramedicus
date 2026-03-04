import nodemailer from 'nodemailer';
import { config } from '../config.js';

function getTransporter() {
  return nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: false,
    auth: {
      user: config.SMTP_USER,
      pass: config.SMTP_PASS || config.RESEND_API_KEY,
    },
  });
}

export function buildEmailPreview({
  to,
  subject,
  htmlBody,
  pdfFilename,
  xmlFilename,
  demoMode = config.DEMO_MODE,
}) {
  const attachments = [
    pdfFilename ? { name: pdfFilename, type: 'application/pdf' } : null,
    xmlFilename ? { name: xmlFilename, type: 'application/xml' } : null,
  ].filter(Boolean);

  return {
    to,
    subject,
    htmlBody,
    attachments,
    demoMode,
  };
}

export async function sendFormEmail({
  to,
  subject,
  htmlBody,
  pdfBuffer,
  pdfFilename,
  xmlContent,
  xmlFilename,
}) {
  const attachments = [];

  if (pdfBuffer && pdfFilename) {
    attachments.push({
      filename: pdfFilename,
      content: pdfBuffer,
      contentType: 'application/pdf',
    });
  }

  if (xmlContent && xmlFilename) {
    attachments.push({
      filename: xmlFilename,
      content: xmlContent,
      contentType: 'application/xml',
    });
  }

  if (config.DEMO_MODE) {
    console.log('[DEMO] Would send email:', {
      to,
      subject,
      attachmentCount: attachments.length,
    });

    return { messageId: `demo-${Date.now()}`, simulated: true };
  }

  const transporter = getTransporter();
  const info = await transporter.sendMail({
    from: config.EMAIL_FROM,
    to,
    subject,
    html: htmlBody,
    attachments,
  });

  return {
    messageId: info.messageId,
    simulated: false,
  };
}
