import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Resend } from "resend";

export interface EmailRecipient {
  name: string;
  email: string;
}

export interface EmailServiceContract {
  sendPasswordReset(user: EmailRecipient, resetUrl: string): Promise<void>;
}

/**
 * Picks the transport based on env: if RESEND_API_KEY is set we use Resend,
 * otherwise everything just logs to the API console. Keeps dev frictionless
 * and lets prod swap implementations without code changes.
 */
@Injectable()
export class EmailService implements EmailServiceContract {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;
  private readonly fromAddress: string;

  constructor(config: ConfigService) {
    const apiKey = config.get<string>("RESEND_API_KEY");
    this.resend = apiKey ? new Resend(apiKey) : null;
    // Resend's `onboarding@resend.dev` works without domain verification but
    // can only reach the account owner's own email. For real users, set
    // RESEND_FROM_EMAIL to a verified sender.
    this.fromAddress =
      config.get<string>("RESEND_FROM_EMAIL") ?? "CineMatch <onboarding@resend.dev>";

    if (!this.resend) {
      this.logger.warn(
        "RESEND_API_KEY is not set — emails will be logged to the console only.",
      );
    }
  }

  async sendPasswordReset(user: EmailRecipient, resetUrl: string): Promise<void> {
    const subject = "Reset your CineMatch password";
    const text = [
      `Hi ${user.name || "there"},`,
      "",
      "We received a request to reset your CineMatch password.",
      "Tap the link below to choose a new one — it expires in 1 hour:",
      "",
      resetUrl,
      "",
      "If you didn't ask for this, you can safely ignore the email.",
    ].join("\n");
    const html = `
      <p>Hi ${escapeHtml(user.name || "there")},</p>
      <p>We received a request to reset your CineMatch password.</p>
      <p>
        <a href="${escapeAttr(resetUrl)}"
           style="display:inline-block;padding:12px 18px;border-radius:10px;background:#a3e635;color:#0b1a02;text-decoration:none;font-weight:700;">
          Reset password
        </a>
      </p>
      <p style="color:#64748b;font-size:13px;">
        Or paste this link into your browser: <br/>
        <a href="${escapeAttr(resetUrl)}">${escapeHtml(resetUrl)}</a>
      </p>
      <p style="color:#64748b;font-size:13px;">
        The link expires in 1 hour. If you didn't ask for a reset, ignore this email.
      </p>
    `;

    if (!this.resend) {
      this.logger.log(
        `[email/console] password reset for ${user.email}: ${resetUrl}`,
      );
      return;
    }

    try {
      await this.resend.emails.send({
        from: this.fromAddress,
        to: user.email,
        subject,
        text,
        html,
      });
      this.logger.log(`[email/resend] sent password reset to ${user.email}`);
    } catch (err) {
      // Don't bubble — the caller already returns a generic success to the
      // client. But do log loudly so the dev knows delivery failed.
      this.logger.error(
        `[email/resend] failed to send password reset to ${user.email}`,
        err as Error,
      );
    }
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}
