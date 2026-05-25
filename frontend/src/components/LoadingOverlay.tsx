'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';

interface LoadingOverlayProps {
  progress: number;
  message: string;
  visible: boolean;
}

export default function LoadingOverlay({ progress, message, visible }: LoadingOverlayProps) {
  if (!visible) return null;

  return (
    <div className="loading-overlay animate-fade-in">
      <div className="loading-card animate-scale-in">
        <div className="loading-icon">
          <Sparkles size={32} color="white" />
        </div>
        <h2 className="loading-title">Generating Your Assessment</h2>
        <p className="loading-message">{message || 'Processing your request...'}</p>
        <div className="loading-progress-bar">
          <div
            className="loading-progress-fill"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <div className="loading-percentage">{Math.round(progress)}%</div>
      </div>
    </div>
  );
}
