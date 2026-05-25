'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAssignmentStore, Assignment } from '@/store/assignmentStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
  Sparkles,
  BookOpen,
  TrendingUp,
  Loader2,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function DashboardPage() {
  const router = useRouter();
  const { assignments, setAssignments } = useAssignmentStore();
  const [loading, setLoading] = useState(true);

  // Connect WebSocket
  useWebSocket();

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      const res = await fetch(`${API_URL}/assignments`);
      const data = await res.json();
      if (data.success) {
        setAssignments(data.assignments);
      }
    } catch (err) {
      console.error('Failed to fetch assignments:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalAssessments = assignments.length;
  const processing = assignments.filter((a) => a.status === 'processing' || a.status === 'pending').length;
  const completed = assignments.filter((a) => a.status === 'completed').length;
  const failed = assignments.filter((a) => a.status === 'failed').length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="badge badge-status badge-pending">Pending</span>;
      case 'processing':
        return <span className="badge badge-status badge-processing">Processing</span>;
      case 'completed':
        return <span className="badge badge-status badge-completed">Completed</span>;
      case 'failed':
        return <span className="badge badge-status badge-failed">Failed</span>;
      default:
        return null;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1>Dashboard</h1>
          <p>Welcome back! Manage your AI-powered assessments here.</p>
        </div>
        <Link href="/create" className="btn btn-primary btn-lg" style={{ textDecoration: 'none' }}>
          <Plus size={20} />
          Create Assessment
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid stagger-children">
        <div className="glass-card stat-card">
          <div className="stat-card-label">Total Assessments</div>
          <div className="stat-card-value">{totalAssessments}</div>
          <div className="stat-card-icon">
            <FileText size={22} />
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-card-label">In Progress</div>
          <div className="stat-card-value">{processing}</div>
          <div className="stat-card-icon">
            <Clock size={22} />
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-card-label">Completed</div>
          <div className="stat-card-value">{completed}</div>
          <div className="stat-card-icon">
            <CheckCircle2 size={22} />
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-card-label">Failed</div>
          <div className="stat-card-value">{failed}</div>
          <div className="stat-card-icon">
            <AlertCircle size={22} />
          </div>
        </div>
      </div>

      {/* Hero Card */}
      <div className="glass-card" style={{
        padding: '40px',
        marginBottom: 32,
        background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(139,92,246,0.08) 100%)',
        border: '1px solid rgba(99,102,241,0.2)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          top: -40,
          right: -40,
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{
              width: 48,
              height: 48,
              background: 'var(--accent-gradient)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Sparkles size={24} color="white" />
            </div>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>AI-Powered Assessment Generation</h2>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Create professional exam papers in minutes</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', marginTop: 20 }}>
            {[
              { icon: BookOpen, label: 'Multiple Question Types', desc: 'MCQ, Short Answer, Long Answer & more' },
              { icon: TrendingUp, label: 'Smart Difficulty', desc: 'Balanced easy, medium & hard questions' },
              { icon: FileText, label: 'PDF Export', desc: 'Download beautifully formatted papers' },
            ].map((feature) => (
              <div key={feature.label} style={{ flex: '1 1 200px', display: 'flex', gap: 12 }}>
                <feature.icon size={20} style={{ color: 'var(--accent-primary)', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{feature.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{feature.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Assessments */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>Recent Assessments</h2>
        {assignments.length > 0 && (
          <Link href="/assessments" className="btn btn-ghost btn-sm" style={{ textDecoration: 'none' }}>
            View All <ArrowRight size={16} />
          </Link>
        )}
      </div>

      {loading ? (
        <div className="glass-card-flat" style={{ padding: 60, textAlign: 'center' }}>
          <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px', color: 'var(--accent-primary)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Loading assessments...</p>
        </div>
      ) : assignments.length === 0 ? (
        <div className="glass-card-flat empty-state">
          <div className="empty-state-icon">
            <FileText size={32} />
          </div>
          <h3>No Assessments Yet</h3>
          <p>Create your first AI-powered assessment to get started.</p>
          <Link href="/create" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            <Plus size={18} />
            Create Your First Assessment
          </Link>
        </div>
      ) : (
        <div className="assignments-list stagger-children">
          {assignments.slice(0, 5).map((assignment) => (
            <div
              key={assignment._id}
              className="glass-card assignment-item"
              onClick={() => {
                if (assignment.status === 'completed') {
                  router.push(`/assessment/${assignment._id}`);
                }
              }}
              style={{ cursor: assignment.status === 'completed' ? 'pointer' : 'default' }}
            >
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 'var(--radius-md)',
                background: 'var(--accent-gradient-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <FileText size={20} style={{ color: 'var(--accent-primary)' }} />
              </div>

              <div className="assignment-item-info">
                <div className="assignment-item-title">{assignment.title}</div>
                <div className="assignment-item-meta">
                  <span>{assignment.subject}</span>
                  <span>Class {assignment.grade}</span>
                  <span>Due: {formatDate(assignment.dueDate)}</span>
                </div>
              </div>

              {getStatusBadge(assignment.status)}

              {assignment.status === 'completed' && (
                <ArrowRight size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
