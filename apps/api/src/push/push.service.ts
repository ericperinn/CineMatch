import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { Expo, ExpoPushMessage } from "expo-server-sdk";
import { PrismaService } from "../prisma/prisma.service";

export type PushType =
  | "friend_request"
  | "friend_accepted"
  | "session_invite"
  | "match";

export interface PushPayload {
  title: string;
  body: string;
  // Routed to the client app — useful for "tap notification to open session id X".
  data?: Record<string, unknown>;
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  // Without an access token Expo rate-limits more aggressively but works for
  // dev. To raise the cap, set EXPO_ACCESS_TOKEN and pass it here.
  private readonly expo = new Expo({
    accessToken: process.env.EXPO_ACCESS_TOKEN,
  });

  constructor(private readonly prisma: PrismaService) {}

  async registerToken(userId: string, token: string, platform: string): Promise<void> {
    if (!Expo.isExpoPushToken(token)) {
      throw new BadRequestException("Not a valid Expo push token");
    }
    // Upsert by token — if the token already belonged to another user (device
    // change, account switch), reassign instead of crashing on the unique key.
    await this.prisma.pushToken.upsert({
      where: { token },
      create: { userId, token, platform },
      update: { userId, platform, lastSeenAt: new Date() },
    });
  }

  async unregisterToken(token: string): Promise<void> {
    await this.prisma.pushToken.deleteMany({ where: { token } });
  }

  async sendToUser(userId: string, payload: PushPayload, type?: PushType): Promise<void> {
    // Respect the user's notification preferences. When `type` isn't given
    // (e.g., a system message), fall through and send.
    if (type) {
      const prefs = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          notifyFriendRequests: true,
          notifySessionInvites: true,
          notifyMatches: true,
        },
      });
      if (!prefs) return;
      const allowed =
        type === "friend_request" || type === "friend_accepted"
          ? prefs.notifyFriendRequests
          : type === "session_invite"
            ? prefs.notifySessionInvites
            : type === "match"
              ? prefs.notifyMatches
              : true;
      if (!allowed) return;
    }

    const rows = await this.prisma.pushToken.findMany({
      where: { userId },
      select: { token: true, platform: true },
    });
    if (rows.length === 0) return;

    const messages: ExpoPushMessage[] = rows
      .filter((row) => Expo.isExpoPushToken(row.token))
      .map((row) => ({
        to: row.token,
        title: payload.title,
        body: payload.body,
        data: payload.data ?? {},
        sound: "default",
        priority: "high",
        channelId: "default",
      }));

    if (messages.length === 0) return;

    const chunks = this.expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      try {
        const receipts = await this.expo.sendPushNotificationsAsync(chunk);
        // Receipts with DeviceNotRegistered mean the user uninstalled or
        // wiped Expo Go — drop those tokens so we don't keep retrying.
        const stale: string[] = [];
        for (let i = 0; i < receipts.length; i++) {
          const receipt = receipts[i];
          if (
            receipt.status === "error" &&
            receipt.details?.error === "DeviceNotRegistered"
          ) {
            stale.push(chunk[i].to as string);
          }
        }
        if (stale.length > 0) {
          await this.prisma.pushToken.deleteMany({
            where: { token: { in: stale } },
          });
          this.logger.log(`Pruned ${stale.length} stale push token(s)`);
        }
      } catch (err) {
        this.logger.error("Push send failed", err);
      }
    }
  }
}
