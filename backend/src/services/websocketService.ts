import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

interface ConnectedClient {
  ws: WebSocket;
  assignmentIds: Set<string>;
}

class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, ConnectedClient> = new Map();

  initialize(server: Server): void {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket) => {
      const clientId = Math.random().toString(36).substring(7);
      this.clients.set(clientId, { ws, assignmentIds: new Set() });

      console.log(`🔌 WebSocket client connected: ${clientId}`);

      // Send acknowledgment
      ws.send(JSON.stringify({
        type: 'connection:ack',
        data: { clientId, message: 'Connected to VedaAI WebSocket' },
      }));

      // Handle messages from client (subscribe to assignment updates)
      ws.on('message', (message: Buffer) => {
        try {
          const parsed = JSON.parse(message.toString());
          if (parsed.type === 'subscribe' && parsed.assignmentId) {
            const client = this.clients.get(clientId);
            if (client) {
              client.assignmentIds.add(parsed.assignmentId);
              console.log(`📡 Client ${clientId} subscribed to assignment ${parsed.assignmentId}`);
            }
          }
        } catch (err) {
          console.error('Failed to parse WS message:', err);
        }
      });

      ws.on('close', () => {
        this.clients.delete(clientId);
        console.log(`🔌 WebSocket client disconnected: ${clientId}`);
      });

      ws.on('error', (err) => {
        console.error(`WebSocket error for client ${clientId}:`, err);
        this.clients.delete(clientId);
      });
    });

    console.log('✅ WebSocket server initialized');
  }

  // Broadcast to all clients subscribed to a specific assignment
  notifyAssignment(assignmentId: string, event: {
    type: string;
    data?: Record<string, unknown>;
  }): void {
    const message = JSON.stringify({
      ...event,
      assignmentId,
    });

    let notified = 0;
    this.clients.forEach((client) => {
      if (
        client.ws.readyState === WebSocket.OPEN &&
        client.assignmentIds.has(assignmentId)
      ) {
        client.ws.send(message);
        notified++;
      }
    });

    console.log(`📢 Notified ${notified} clients for assignment ${assignmentId}: ${event.type}`);
  }

  // Broadcast to ALL connected clients
  broadcast(event: { type: string; data?: Record<string, unknown>; assignmentId?: string }): void {
    const message = JSON.stringify(event);
    this.clients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    });
  }
}

// Singleton
export const wsService = new WebSocketService();
