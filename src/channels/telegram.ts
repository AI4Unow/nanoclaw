import TelegramBot from 'node-telegram-bot-api';

import { TELEGRAM_BOT_TOKEN } from '../config.js';
import { logger } from '../logger.js';
import { Channel, OnInboundMessage, OnChatMetadata, RegisteredGroup } from '../types.js';

export interface TelegramChannelOpts {
  onMessage: OnInboundMessage;
  onChatMetadata: OnChatMetadata;
  registeredGroups: () => Record<string, RegisteredGroup>;
}

/**
 * TelegramChannel — implements the Channel interface for Telegram Bot API.
 *
 * JID format: "tg:<chat_id>" for groups, "tg:<user_id>" for DMs.
 * The bot uses long polling (no webhook needed).
 *
 * Env vars:
 *   TELEGRAM_BOT_TOKEN — required, from @BotFather
 */
export class TelegramChannel implements Channel {
  name = 'telegram';
  private bot!: TelegramBot;
  private connected = false;
  private onMessage: OnInboundMessage;
  private onChatMetadata: OnChatMetadata;
  private registeredGroups: () => Record<string, RegisteredGroup>;

  constructor(opts: TelegramChannelOpts) {
    this.onMessage = opts.onMessage;
    this.onChatMetadata = opts.onChatMetadata;
    this.registeredGroups = opts.registeredGroups;
  }

  async connect(): Promise<void> {
    if (!TELEGRAM_BOT_TOKEN) {
      logger.warn('TELEGRAM_BOT_TOKEN not set, Telegram channel disabled');
      return;
    }

    this.bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

    const botInfo = await this.bot.getMe();
    logger.info(
      { botUsername: botInfo.username, botId: botInfo.id },
      'Telegram bot connected',
    );

    this.bot.on('message', (msg) => this.handleMessage(msg));

    this.bot.on('polling_error', (err) => {
      logger.error({ err }, 'Telegram polling error');
    });

    this.connected = true;
    logger.info('Telegram channel connected');
  }

  private handleMessage(msg: TelegramBot.Message): void {
    if (!msg.text) return; // Skip non-text messages for now
    if (msg.from?.is_bot) return; // Ignore other bots

    const chatId = msg.chat.id;
    const jid = `tg:${chatId}`;
    const isGroup = msg.chat.type === 'group' || msg.chat.type === 'supergroup';

    // Build sender name
    const senderName = [msg.from?.first_name, msg.from?.last_name]
      .filter(Boolean)
      .join(' ') || msg.from?.username || 'Unknown';

    // Build chat name
    const chatName = isGroup
      ? msg.chat.title || `Telegram Group ${chatId}`
      : senderName;

    // Store chat metadata (Telegram delivers names inline)
    const timestamp = new Date(msg.date * 1000).toISOString();
    this.onChatMetadata(jid, timestamp, chatName, 'telegram', isGroup);

    // Build NewMessage
    const newMessage = {
      id: `tg_${msg.message_id}_${chatId}`,
      chat_jid: jid,
      sender: msg.from?.id?.toString() || 'unknown',
      sender_name: senderName,
      content: msg.text,
      timestamp,
      is_from_me: false,
      is_bot_message: false,
    };

    this.onMessage(jid, newMessage);
  }

  async sendMessage(jid: string, text: string): Promise<void> {
    if (!this.bot || !this.connected) {
      logger.warn({ jid }, 'Cannot send: Telegram not connected');
      return;
    }

    const chatId = jid.replace(/^tg:/, '');

    // Telegram has a 4096 char limit per message. Split if needed.
    const MAX_LEN = 4096;
    const chunks: string[] = [];
    let remaining = text;
    while (remaining.length > 0) {
      if (remaining.length <= MAX_LEN) {
        chunks.push(remaining);
        break;
      }
      // Try to split at a newline
      let splitAt = remaining.lastIndexOf('\n', MAX_LEN);
      if (splitAt <= 0) splitAt = MAX_LEN;
      chunks.push(remaining.slice(0, splitAt));
      remaining = remaining.slice(splitAt).trimStart();
    }

    for (const chunk of chunks) {
      try {
        await this.bot.sendMessage(chatId, chunk, { parse_mode: undefined });
      } catch (err) {
        logger.error({ jid, err }, 'Failed to send Telegram message');
      }
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  ownsJid(jid: string): boolean {
    return jid.startsWith('tg:');
  }

  async disconnect(): Promise<void> {
    if (this.bot) {
      await this.bot.stopPolling();
      this.connected = false;
      logger.info('Telegram channel disconnected');
    }
  }

  async setTyping(jid: string, isTyping: boolean): Promise<void> {
    if (!this.bot || !this.connected || !isTyping) return;
    const chatId = jid.replace(/^tg:/, '');
    try {
      await this.bot.sendChatAction(chatId, 'typing');
    } catch (err) {
      logger.warn({ jid, err }, 'Failed to send typing action');
    }
  }
}
