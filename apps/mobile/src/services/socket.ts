import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/useAuthStore';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

class SocketService {
  private socket: Socket | null = null;

  connect() {
    if (this.socket?.connected) return;

    const token = useAuthStore.getState().token;
    if (!token) {
      console.warn('Attempted to connect to socket without token');
      return;
    }

    this.socket = io(`${API_URL}/match`, {
      transports: ['websocket'],
      query: { token },
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      console.log('Connected to MatchGateway');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from MatchGateway:', reason);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket() {
    return this.socket;
  }
}

export const socketService = new SocketService();
