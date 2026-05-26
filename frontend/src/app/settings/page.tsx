'use client';

import React, { useState } from 'react';
import { useAssignmentStore } from '@/store/assignmentStore';
import {
  Settings,
  Key,
  Eye,
  EyeOff,
  Save,
  CheckCircle2,
  Sparkles,
  Database,
  Lock,
} from 'lucide-react';

export default function SettingsPage() {
  const { geminiApiKey, setGeminiApiKey } = useAssignmentStore();
  const [apiKeyInput, setApiKeyInput] = useState(geminiApiKey);
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setGeminiApiKey(apiKeyInput);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: 800, margin: '0 auto' }}>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: 32 }}>
        <h1>Settings</h1>
        <p>Configure VedaAI preferences and credentials.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* API Settings */}
        <form className="glass-card" onSubmit={handleSave} style={{ padding: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 'var(--radius-md)',
              background: 'var(--accent-gradient-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-primary)',
            }}>
              <Key size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Google Gemini API Configuration</h2>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>Provide your own Gemini API key for live generation.</p>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 24 }}>
            <label className="form-label" htmlFor="api-key">Gemini API Key</label>
            <div style={{ position: 'relative' }}>
              <input
                id="api-key"
                type={showKey ? 'text' : 'password'}
                className="form-input"
                style={{ paddingRight: 48 }}
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="AIzaSy..."
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Lock size={12} /> Stored locally in your browser. Never sent anywhere except to the VedaAI Generation queue.
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 16 }}>
            {saved && (
              <span style={{ color: 'var(--success)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={16} /> Saved configuration successfully!
              </span>
            )}
            <button type="submit" className="btn btn-primary">
              <Save size={16} /> Save Changes
            </button>
          </div>
        </form>

        {/* Security & System Info */}
        <div className="glass-card" style={{ padding: 32 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Database size={18} style={{ color: 'var(--accent-primary)' }} /> System Architecture Details
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Mock Generator Fallback</span>
              <span style={{ fontWeight: 600, color: 'var(--success)' }}>Enabled (Automatically falls back when API key is unset)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Generation Model</span>
              <span style={{ fontWeight: 600 }}>Gemini 2.0 Flash</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Queue System</span>
              <span style={{ fontWeight: 600 }}>BullMQ + Redis Cache (Background Job Runner)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 4 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Real-Time Updates</span>
              <span style={{ fontWeight: 600 }}>WebSockets (Automatic Reconnection Protocol)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
