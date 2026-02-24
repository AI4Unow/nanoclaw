/**
 * Email Channel for NanoClaw
 * Polls Gmail for new emails matching the configured trigger (subject prefix),
 * routes them to the agent, and sends replies.
 */
import fs from 'fs';
import path from 'path';

import { EMAIL_POLL_INTERVAL, EMAIL_SUBJECT_PREFIX, GROUPS_DIR } from './config.js';
import { gmailClient, EmailMessage } from './gmail-client.js';
import { isEmailProcessed, markEmailProcessed, markEmailResponded } from './db.js';
import { logger } from './logger.js';
import { RegisteredGroup } from './types.js';

// JID prefix for email-originated conversations
export const EMAIL_JID_PREFIX = 'email:';

/**
 * Build the Gmail search query for unread emails matching the subject prefix.
 */
function buildSearchQuery(): string {
  return `subject:${EMAIL_SUBJECT_PREFIX} is:unread`;
}

/**
 * Derive a stable context key from the sender address.
 * Used as the group folder name for per-sender isolation.
 */
export function senderContextKey(from: string): string {
  // Extract bare email address from "Name <email>" format
  const match = from.match(/<([^>]+)>/) || from.match(/(\S+@\S+)/);
  const email = match ? match[1].toLowerCase() : from.toLowerCase();
  // Sanitize to a valid folder name
  return `email-${email.replace(/[^a-z0-9]/g, '-')}`;
}

/**
 * Build a RegisteredGroup for an email sender context.
 * These are ephemeral — not stored in DB, created on demand.
 */
export function buildEmailGroup(contextKey: string): RegisteredGroup {
  return {
    name: contextKey,
    folder: contextKey,
    trigger: '',
    added_at: new Date().toISOString(),
    requiresTrigger: false,
  };
}

/**
 * Ensure the email group folder exists on disk.
 */
export function ensureEmailGroupFolder(contextKey: string): void {
  const groupDir = path.join(GROUPS_DIR, contextKey);
  fs.mkdirSync(path.join(groupDir, 'logs'), { recursive: true });

  // Write a minimal CLAUDE.md if not present
  const claudeMd = path.join(groupDir, 'CLAUDE.md');
  if (!fs.existsSync(claudeMd)) {
    fs.writeFileSync(claudeMd, `# Email Channel\n\nYou are responding to emails. Your responses will be sent as email replies.\n\nBe professional, clear, and concise. Use proper email formatting.\n`);
  }
}

/**
 * Fetch new triggering emails from Gmail.
 */
export async function fetchNewEmails(): Promise<EmailMessage[]> {
  const query = buildSearchQuery();
  const refs = await gmailClient.searchEmails(query);

  const emails: EmailMessage[] = [];
  for (const ref of refs) {
    if (isEmailProcessed(ref.id)) continue;
    try {
      const email = await gmailClient.getEmail(ref.id);
      emails.push(email);
    } catch (err) {
      logger.warn({ id: ref.id, err }, 'Failed to fetch email');
    }
  }
  return emails;
}

/**
 * Format an email into a prompt for the agent.
 */
export function formatEmailPrompt(email: EmailMessage): string {
  return `<email>
<from>${email.from}</from>
<subject>${email.subject}</subject>
<body>
${email.body}
</body>
</email>

Please respond to this email. Your response will be sent as an email reply.`;
}

/**
 * Send a reply and mark the email as processed.
 */
export async function sendEmailReply(email: EmailMessage, replyBody: string): Promise<void> {
  await gmailClient.sendReply(email.from, email.subject, replyBody, email.threadId, email.messageId);
  await gmailClient.markRead(email.id);
  markEmailResponded(email.id);
  logger.info({ to: email.from, subject: email.subject }, 'Email reply sent');
}

export { EMAIL_POLL_INTERVAL, EMAIL_SUBJECT_PREFIX };
