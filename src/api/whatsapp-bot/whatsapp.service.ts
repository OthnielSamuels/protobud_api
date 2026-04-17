import { Injectable, Logger } from '@nestjs/common';

/**
 * WhatsappService lives in the NestJS backend.
 *
 * The WhatsApp bot is a separate process — this service provides:
 * 1. A health-check ping to the bot container
 * 2. An outbound message sender (for operator-triggered replies,
 *    e.g. "Your quote is ready")
 *
 * Communication is via HTTP on the internal Docker network.
 * The bot exposes a minimal HTTP server for this purpose.
 */
@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly botUrl: string;

  constructor() {
    this.botUrl = process.env.WHATSAPP_BOT_URL ?? 'http://whatsapp-bot:3001';
  }

  /**
   * Send a message to a WhatsApp number.
   * Used by operators to notify clients when their quote is ready.
   *
   * @param phone  WhatsApp ID e.g. "5970000000@c.us"
   * @param text   Message text to send
   */
  async sendMessage(phone: string, text: string): Promise<boolean> {
    const normalizedPhone = this.normalizeWhatsappPhone(phone);

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10_000);

      const response = await fetch(`${this.botUrl}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalizedPhone, message: text }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        this.logger.warn(`Bot send failed: HTTP ${response.status}`);
        return false;
      }

      this.logger.log(`Message sent to ${normalizedPhone}`);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`sendMessage failed: ${msg}`);
      return false;
    }
  }

  /**
   * Health check — is the bot container up and connected to WhatsApp?
   */
  async getHealth(): Promise<{ connected: boolean; status: string }> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5_000);

      const response = await fetch(`${this.botUrl}/health`, {
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        return { connected: false, status: 'bot_unhealthy' };
      }

      const data = (await response.json()) as { connected: boolean };
      return {
        connected: data.connected,
        status: data.connected ? 'connected' : 'disconnected',
      };
    } catch {
      return { connected: false, status: 'bot_unreachable' };
    }
  }

  private normalizeWhatsappPhone(phone: string): string {
    const trimmed = phone.trim();
    if (trimmed.endsWith('@c.us') || trimmed.endsWith('@s.whatsapp.net')) {
      return trimmed;
    }

    const digits = trimmed.replace(/[^\d]/g, '');
    return digits ? `${digits}@c.us` : trimmed;
  }
}
