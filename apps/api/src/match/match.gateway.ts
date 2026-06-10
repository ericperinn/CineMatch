import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { SessionMode, VoteType } from "@prisma/client";
import { Server, WebSocket } from "ws";
import { MatchService } from "./match.service";
import { PushService, PushType } from "../push/push.service";

interface AuthenticatedWebSocket extends WebSocket {
  userId: string;
}

@WebSocketGateway({ path: "/match" })
export class MatchGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(MatchGateway.name);
  private userSockets = new Map<string, AuthenticatedWebSocket>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly matchService: MatchService,
    private readonly push: PushService,
  ) {}

  // Fire-and-forget push helper — never bubble errors into the WS handler.
  private tryPush(
    userId: string,
    title: string,
    body: string,
    type: PushType,
    data?: Record<string, unknown>,
  ) {
    this.push.sendToUser(userId, { title, body, data }, type).catch((err) => {
      this.logger.warn(`Push to ${userId} failed: ${err.message}`);
    });
  }

  async handleConnection(client: WebSocket, ...args: any[]) {
    try {
      const request = args[0];
      const url = new URL(request.url, `ws://${request.headers.host}`);
      const token = url.searchParams.get("token");

      if (!token) {
        this.logger.warn("WebSocket connection attempt without token");
        client.close(1008, "Missing token");
        return;
      }

      const secret = this.configService.get<string>("JWT_SECRET");
      const payload = this.jwtService.verify(token, { secret });

      (client as AuthenticatedWebSocket).userId = payload.sub;
      this.userSockets.set(payload.sub, client as AuthenticatedWebSocket);

      this.logger.log(`User ${payload.sub} connected to MatchGateway`);
    } catch (err) {
      this.logger.error("WebSocket authentication failed", err);
      client.close(1008, "Invalid token");
    }
  }

  handleDisconnect(client: AuthenticatedWebSocket) {
    if (client.userId) {
      this.userSockets.delete(client.userId);
      this.logger.log(`User ${client.userId} disconnected`);
      // Note: we are not immediately abandoning sessions here for simplicity in v1.
      // If needed, we can loop through their active sessions and abandon them.
    }
  }

  private sendToUser(userId: string, event: string, data: any) {
    const socket = this.userSockets.get(userId);
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ event, data }));
    }
  }

  private sendToSession(hostId: string, guestId: string, event: string, data: any) {
    this.sendToUser(hostId, event, data);
    this.sendToUser(guestId, event, data);
  }

  @SubscribeMessage("ping")
  handlePing(@ConnectedSocket() client: AuthenticatedWebSocket) {
    return { event: "pong", data: {} };
  }

  @SubscribeMessage("session:create")
  async handleCreateSession(
    @ConnectedSocket() client: AuthenticatedWebSocket,
    @MessageBody() payload: { guestId: string; mode: SessionMode },
  ) {
    try {
      const session = await this.matchService.createSession(client.userId, payload.guestId, payload.mode);
      this.sendToUser(client.userId, "session:created", session);
      // Push a live invite to the guest so they don't need to paste the code.
      // If the guest is offline, this is a noop and they'd have to use the
      // code (or a future REST endpoint listing pending invites).
      this.sendToUser(payload.guestId, "session:invite", {
        sessionId: session.id,
        mode: session.mode,
        host: session.host,
      });

      this.tryPush(
        payload.guestId,
        "Session invite",
        `${session.host.name} wants to swipe with you`,
        "session_invite",
        { type: "session_invite", sessionId: session.id },
      );
    } catch (error: any) {
      this.sendToUser(client.userId, "error", { code: "CREATE_FAILED", message: error.message });
    }
  }

  @SubscribeMessage("session:join")
  async handleJoinSession(
    @ConnectedSocket() client: AuthenticatedWebSocket,
    @MessageBody() payload: { sessionId: string },
  ) {
    try {
      const session = await this.matchService.joinSession(payload.sessionId, client.userId);
      this.sendToUser(session.hostId, "session:guest-joined", { userId: client.userId });

      // Generate the initial batch of movies
      const initialBatch = await this.matchService.getNextBatch(session.id);
      
      this.sendToSession(session.hostId, session.guestId, "session:ready", {
        session,
        initialBatch,
      });
    } catch (error: any) {
      this.sendToUser(client.userId, "error", { code: "JOIN_FAILED", message: error.message });
    }
  }

  @SubscribeMessage("session:leave")
  async handleLeaveSession(
    @ConnectedSocket() client: AuthenticatedWebSocket,
    @MessageBody() payload: { sessionId: string },
  ) {
    try {
      await this.matchService.abandonSession(payload.sessionId);
      // Notify both if possible
      // In a real app we'd fetch the session first to know the other user
      this.sendToUser(client.userId, "session:abandoned", { reason: "User left" });
    } catch (error: any) {
      this.logger.error("Failed to leave session", error);
    }
  }

  @SubscribeMessage("swipe")
  async handleSwipe(
    @ConnectedSocket() client: AuthenticatedWebSocket,
    @MessageBody() payload: { sessionId: string; movieId: string; vote: VoteType },
  ) {
    try {
      const result = await this.matchService.handleSwipe(
        payload.sessionId,
        client.userId,
        payload.movieId,
        payload.vote,
      );

      // In a real app we'd fetch session host/guest from memory. Let's assume we can fetch it again or it's cached.
      // For now we need to get the session to know who the other user is.
      const session = await this.matchService.joinSession(payload.sessionId, client.userId).catch(() => null);
      if (!session) return;
      
      const otherUserId = session.hostId === client.userId ? session.guestId : session.hostId;
      this.sendToUser(otherUserId, "swipe:received", {
        userId: client.userId,
        movieId: payload.movieId,
        vote: payload.vote,
      });

      if (result.match && result.movie) {
        this.sendToSession(session.hostId, session.guestId, "match", {
          movie: result.movie,
          currentCount: result.currentCount,
          podiumSize: result.podiumSize,
        });

        const matchTitle = "It's a match!";
        const matchBody = `${result.movie.title} — ${result.currentCount} of ${result.podiumSize} on your podium`;
        const matchData = { type: "match", sessionId: session.id, movieId: result.movie.id };
        this.tryPush(session.hostId, matchTitle, matchBody, "match", matchData);
        this.tryPush(session.guestId, matchTitle, matchBody, "match", matchData);

        if (result.isCompleted) {
          const podium = await this.matchService.getPodium(session.id);
          this.sendToSession(session.hostId, session.guestId, "session:completed", {
            podium,
            providers: [], // Phase 7 will integrate JustWatch
          });
        }
      }
    } catch (error: any) {
      this.sendToUser(client.userId, "error", { code: "SWIPE_FAILED", message: error.message });
    }
  }

  @SubscribeMessage("request-next-batch")
  async handleRequestNextBatch(
    @ConnectedSocket() client: AuthenticatedWebSocket,
    @MessageBody() payload: { sessionId: string; count: number },
  ) {
    try {
      const batch = await this.matchService.getNextBatch(payload.sessionId, payload.count);
      this.sendToUser(client.userId, "batch", batch);
    } catch (error: any) {
      this.sendToUser(client.userId, "error", { code: "BATCH_FAILED", message: error.message });
    }
  }
}
