import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

/**
 * Outgoing email over SMTP. Works with any email provider that offers SMTP,
 * including sandbox inboxes meant for testing.
 *
 * Without SMTP_HOST in development, Nodemailer's disposable test inbox is created so
 * the flow can be tried without credentials; the API returns a preview link.
 */

export class EmailConfigError extends Error {
  name = "EmailConfigError";
}

export class RecipientNotAllowedError extends Error {
  name = "RecipientNotAllowedError";
}

interface Mailer {
  transporter: Transporter;
  from: string;
  isTestInbox: boolean;
}

const TIMEOUTS = { connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 20_000 };

let mailerPromise: Promise<Mailer> | null = null;

async function createMailer(): Promise<Mailer> {
  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, EMAIL_FROM } = process.env;

  if (SMTP_HOST) {
    if (!EMAIL_FROM) throw new EmailConfigError("EMAIL_FROM must be set when SMTP_HOST is configured.");
    const port = Number(SMTP_PORT || 587);
    return {
      transporter: nodemailer.createTransport({
        host: SMTP_HOST,
        port,
        // Port 465 uses implicit TLS; 587 upgrades with STARTTLS.
        secure: SMTP_SECURE ? SMTP_SECURE === "true" : port === 465,
        auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS ?? "" } : undefined,
        ...TIMEOUTS,
      }),
      from: EMAIL_FROM,
      isTestInbox: false,
    };
  }

  if (process.env.NODE_ENV === "production") {
    throw new EmailConfigError("Email is not configured. Set SMTP_HOST and EMAIL_FROM.");
  }

  const account = await nodemailer.createTestAccount();
  return {
    transporter: nodemailer.createTransport({
      host: account.smtp.host,
      port: account.smtp.port,
      secure: account.smtp.secure,
      auth: { user: account.user, pass: account.pass },
      ...TIMEOUTS,
    }),
    from: EMAIL_FROM || `Invoice Generator <${account.user}>`,
    isTestInbox: true,
  };
}

function getMailer(): Promise<Mailer> {
  mailerPromise ??= createMailer().catch((error) => {
    mailerPromise = null; // allow a retry after a transient failure
    throw error;
  });
  return mailerPromise;
}

/**
 * EMAIL_ALLOWED_RECIPIENTS is an optional comma-separated allowlist of
 * addresses ("me@example.com") or domains ("@example.com"). Use it while
 * testing so invoices can only reach inboxes you control.
 */
export function assertRecipientAllowed(recipient: string): void {
  const allowlist = (process.env.EMAIL_ALLOWED_RECIPIENTS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  if (allowlist.length === 0) return;

  const address = recipient.toLowerCase();
  const allowed = allowlist.some((entry) => (entry.startsWith("@") ? address.endsWith(entry) : address === entry));
  if (!allowed) {
    throw new RecipientNotAllowedError("This server only sends test emails to approved addresses.");
  }
}

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

export async function sendEmail(email: OutgoingEmail): Promise<{ messageId: string; previewUrl: string | null }> {
  const mailer = await getMailer();
  const info = await mailer.transporter.sendMail({ from: mailer.from, ...email });
  const previewUrl = mailer.isTestInbox ? nodemailer.getTestMessageUrl(info) || null : null;
  return { messageId: info.messageId, previewUrl };
}
