import { API_URL } from './api';
import { useAuthStore } from '../store/useAuthStore';

type Listener = (data: any) => void;

// Internal lifecycle events callers can subscribe to alongside server events.
export const SOCKET_OPEN = '__socket_open__';
export const SOCKET_CLOSE = '__socket_close__';
export const SOCKET_ERROR = '__socket_error__';

class SocketService {
  private ws: WebSocket | null = null;
  private listeners = new Map<string, Set<Listener>>();
  // Messages queued while the socket is still connecting. Flushed on open.
  private outbox: string[] = [];

  connect() {
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    const token = useAuthStore.getState().token;
    if (!token) {
      console.warn('[socket] connect called without an auth token');
      return;
    }

    const wsUrl = `${API_URL.replace(/^http/, 'ws')}/match?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrl);
    this.ws = ws;

    ws.onopen = () => {
      this.flush();
      this.dispatch(SOCKET_OPEN, {});
    };

    ws.onmessage = (event) => {
      const raw = typeof event.data === 'string' ? event.data : '';
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.event === 'string') {
          this.dispatch(parsed.event, parsed.data);
        }
      } catch {
        // Non-JSON frame; ignore.
      }
    };

    ws.onerror = (event) => this.dispatch(SOCKET_ERROR, event);

    ws.onclose = (event) => {
      if (this.ws === ws) this.ws = null;
      this.dispatch(SOCKET_CLOSE, { code: event.code, reason: event.reason });
    };
  }

  disconnect() {
    this.outbox = [];
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  emit(event: string, data: unknown = {}) {
    const payload = JSON.stringify({ event, data });
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(payload);
    } else {
      this.outbox.push(payload);
      // Auto-connect if a caller emits before connect(). Common when navigating
      // into a screen that emits on mount.
      this.connect();
    }
  }

  on(event: string, callback: Listener): () => void {
    let bucket = this.listeners.get(event);
    if (!bucket) {
      bucket = new Set();
      this.listeners.set(event, bucket);
    }
    bucket.add(callback);
    return () => this.off(event, callback);
  }

  off(event: string, callback: Listener) {
    this.listeners.get(event)?.delete(callback);
  }

  isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private dispatch(event: string, data: unknown) {
    const bucket = this.listeners.get(event);
    if (!bucket) return;
    // Iterate over a snapshot so listeners can unsubscribe during dispatch.
    [...bucket].forEach((cb) => {
      try {
        cb(data);
      } catch (err) {
        console.error(`[socket] listener for "${event}" threw`, err);
      }
    });
  }

  private flush() {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    for (const msg of this.outbox) this.ws.send(msg);
    this.outbox = [];
  }
}

export const socketService = new SocketService();
