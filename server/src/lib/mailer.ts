import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../config/logger';

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!env.mail.host) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.mail.host,
      port: env.mail.port,
      secure: env.mail.secure,
      auth: env.mail.user ? { user: env.mail.user, pass: env.mail.pass } : undefined,
    });
  }
  return transporter;
}

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Sends transactional email.
 *
 * When SMTP is not configured the message is logged instead of sent, so a fresh
 * install can still complete the password-reset flow while the owner wires up a mail
 * server in Settings → Email.
 */
export async function sendMail(message: MailMessage): Promise<void> {
  const transport = getTransporter();

  if (!transport) {
    logger.warn(
      { to: message.to, subject: message.subject },
      'SMTP is not configured — email was not sent (message logged instead)',
    );
    logger.info({ body: message.text }, 'Outgoing email (SMTP disabled)');
    return;
  }

  await transport.sendMail({
    from: env.mail.from,
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });
}

export function passwordResetEmail(name: string, token: string): string {
  return [
    `Hello ${name},`,
    '',
    'Use the link below to choose a new password. It expires in 60 minutes and can be used once.',
    '',
    `${env.appUrl}/reset-password?token=${token}`,
    '',
    'If you did not ask for this, you can ignore this email — your password has not changed.',
  ].join('\n');
}
