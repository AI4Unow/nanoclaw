/**
 * Minimal Gmail REST API client using saved OAuth credentials.
 * Reads tokens from ~/.gmail-mcp/ (written by @gongrzhe/server-gmail-autoauth-mcp).
 */
import https from 'https';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { logger } from './logger.js';

const CREDENTIALS_PATH = path.join(os.homedir(), '.gmail-mcp', 'credentials.json');
const OAUTH_KEYS_PATH = path.join(os.homedir(), '.gmail-mcp', 'gcp-oauth.keys.json');

interface GmailCredentials {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
  token_type: string;
}

interface OAuthKeys {
  installed: { client_id: string; client_secret: string };
}

export interface EmailMessage {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  body: string;
  messageId: string; // Message-ID header for threading
}

function httpsRequest(options: https.RequestOptions, body?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

export class GmailClient {
  private creds: GmailCredentials | null = null;
  private keys: OAuthKeys | null = null;

  private loadCredentials(): void {
    this.creds = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf-8'));
    this.keys = JSON.parse(fs.readFileSync(OAUTH_KEYS_PATH, 'utf-8'));
  }

  private async refreshIfNeeded(): Promise<void> {
    if (!this.creds || !this.keys) this.loadCredentials();
    const creds = this.creds!;
    const keys = this.keys!;

    // Refresh if expired or expiring within 60s
    if (creds.expiry_date && Date.now() < creds.expiry_date - 60_000) return;

    const body = new URLSearchParams({
      client_id: keys.installed.client_id,
      client_secret: keys.installed.client_secret,
      refresh_token: creds.refresh_token,
      grant_type: 'refresh_token',
    }).toString();

    const raw = await httpsRequest({
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
    }, body);

    const tokens = JSON.parse(raw);
    if (!tokens.access_token) throw new Error(`Token refresh failed: ${raw}`);

    creds.access_token = tokens.access_token;
    creds.expiry_date = Date.now() + (tokens.expires_in || 3600) * 1000;
    fs.writeFileSync(CREDENTIALS_PATH, JSON.stringify(creds, null, 2));
    logger.debug('Gmail token refreshed');
  }

  private async apiGet(apiPath: string): Promise<unknown> {
    await this.refreshIfNeeded();
    const raw = await httpsRequest({
      hostname: 'gmail.googleapis.com',
      path: apiPath,
      method: 'GET',
      headers: { Authorization: `Bearer ${this.creds!.access_token}` },
    });
    return JSON.parse(raw);
  }

  private async apiPost(apiPath: string, body: unknown): Promise<unknown> {
    await this.refreshIfNeeded();
    const bodyStr = JSON.stringify(body);
    const raw = await httpsRequest({
      hostname: 'gmail.googleapis.com',
      path: apiPath,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.creds!.access_token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
      },
    }, bodyStr);
    return JSON.parse(raw);
  }

  async searchEmails(query: string): Promise<Array<{ id: string; threadId: string }>> {
    const res = await this.apiGet(`/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=10`) as { messages?: Array<{ id: string; threadId: string }> };
    return res.messages || [];
  }

  async getEmail(id: string): Promise<EmailMessage> {
    const msg = await this.apiGet(`/gmail/v1/users/me/messages/${id}?format=full`) as {
      id: string; threadId: string;
      payload: { headers: Array<{ name: string; value: string }>; body?: { data?: string }; parts?: Array<{ mimeType: string; body: { data?: string } }> };
    };

    const headers = msg.payload.headers;
    const getHeader = (name: string) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';

    // Extract plain text body from simple or multipart message
    let body = '';
    if (msg.payload.body?.data) {
      body = Buffer.from(msg.payload.body.data, 'base64').toString('utf-8');
    } else if (msg.payload.parts) {
      const textPart = msg.payload.parts.find(p => p.mimeType === 'text/plain');
      if (textPart?.body?.data) {
        body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
      }
    }

    return {
      id: msg.id,
      threadId: msg.threadId,
      from: getHeader('From'),
      subject: getHeader('Subject'),
      body: body.trim(),
      messageId: getHeader('Message-ID'),
    };
  }

  async sendReply(to: string, subject: string, body: string, threadId: string, inReplyTo: string): Promise<void> {
    const replySubject = subject.startsWith('Re:') ? subject : `Re: ${subject}`;
    const mime = [
      `To: ${to}`,
      `Subject: ${replySubject}`,
      `In-Reply-To: ${inReplyTo}`,
      `References: ${inReplyTo}`,
      'Content-Type: text/plain; charset=utf-8',
      '',
      body,
    ].join('\r\n');

    const encoded = Buffer.from(mime).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    await this.apiPost('/gmail/v1/users/me/messages/send', { raw: encoded, threadId });
  }

  async markRead(id: string): Promise<void> {
    await this.apiPost(`/gmail/v1/users/me/messages/${id}/modify`, { removeLabelIds: ['UNREAD'] });
  }
}

export const gmailClient = new GmailClient();
