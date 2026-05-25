'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAssignmentStore } from '@/store/assignmentStore';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:5002/ws';

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const {
    setGenerationStatus,
    setGenerationProgress,
    updateAssignmentStatus,
  } = useAssignmentStore();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ WebSocket connected');
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleMessage(message);
        } catch (err) {
          console.error('Failed to parse WS message:', err);
        }
      };

      ws.onclose = () => {
        console.log('🔌 WebSocket disconnected, reconnecting in 3s...');
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
      };
    } catch (err) {
      console.error('Failed to create WebSocket:', err);
      reconnectTimeoutRef.current = setTimeout(connect, 5000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMessage = useCallback((message: {
    type: string;
    assignmentId?: string;
    data?: {
      progress?: number;
      message?: string;
      error?: string;
    };
  }) => {
    const { type, assignmentId, data } = message;

    switch (type) {
      case 'connection:ack':
        console.log('📡 WS connection acknowledged');
        break;

      case 'job:started':
        if (assignmentId) {
          updateAssignmentStatus(assignmentId, 'processing');
          setGenerationStatus('processing');
          setGenerationProgress({
            progress: data?.progress || 10,
            message: data?.message || 'Starting generation...',
          });
        }
        break;

      case 'job:progress':
        setGenerationProgress({
          progress: data?.progress || 0,
          message: data?.message || 'Processing...',
        });
        break;

      case 'job:completed':
        if (assignmentId) {
          updateAssignmentStatus(assignmentId, 'completed');
          setGenerationStatus('completed');
          setGenerationProgress({
            progress: 100,
            message: data?.message || 'Completed!',
          });
        }
        break;

      case 'job:failed':
        if (assignmentId) {
          updateAssignmentStatus(assignmentId, 'failed');
          setGenerationStatus('failed');
          setGenerationProgress({
            progress: 0,
            message: data?.error || 'Generation failed',
          });
        }
        break;
    }
  }, [setGenerationStatus, setGenerationProgress, updateAssignmentStatus]);

  const subscribe = useCallback((assignmentId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'subscribe',
        assignmentId,
      }));
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    wsRef.current?.close();
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return { subscribe, disconnect, connect };
}
