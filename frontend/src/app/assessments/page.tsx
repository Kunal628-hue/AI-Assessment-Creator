'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAssignmentStore, Assignment } from '@/store/assignmentStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import {
  FileText,
  Plus,
  ArrowRight,
  Loader2,
  Calendar,
  BookOpen,
  GraduationCap,
  RefreshCw,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function AssessmentsPage() {
  const router = useRouter();
  const { assignments, setAssignments } = useAssignmentStore();
  const [loading, setLoading] = useState(true);
  
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

  const getTotalQuestions = (a: Assignment) => {
    return a.questionConfigs.reduce((sum, qc) => sum + qc.count, 0);
  };

  const getTotalMarks = (a: Assignment) => {
    return a.questionConfigs.reduce((sum, qc) => sum + qc.count * qc.marksPerQuestion, 0);
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1>My Assessments</h1>
          <p>View and manage all your generated assessments.</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-secondary btn-sm" onClick={fetchAssignments}>
            <RefreshCw size={16} /> Refresh
          </button>
          <button className="btn btn-primary" onClick={() => router.push('/create')}>
            <Plus size={18} /> New Assessment
          </button>
        </div>
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
          <button className="btn btn-primary" onClick={() => router.push('/create')}>
            <Plus size={18} />
            Create Your First Assessment
          </button>
        </div>
      ) : (
        <div className="assignments-list stagger-children">
          {assignments.map((assignment) => (
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
                width: 48,
                height: 48,
                borderRadius: 'var(--radius-md)',
                background: 'var(--accent-gradient-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <FileText size={22} style={{ color: 'var(--accent-primary)' }} />
              </div>

              <div className="assignment-item-info">
                <div className="assignment-item-title">{assignment.title}</div>
                <div className="assignment-item-meta">
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <BookOpen size={13} /> {assignment.subject}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <GraduationCap size={13} /> Class {assignment.grade}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Calendar size={13} /> Due: {formatDate(assignment.dueDate)}
                  </span>
                  <span>{getTotalQuestions(assignment)} Questions</span>
                  <span>{getTotalMarks(assignment)} Marks</span>
                </div>
              </div>

              {getStatusBadge(assignment.status)}

              {assignment.status === 'completed' && (
                <button className="btn btn-ghost btn-sm" style={{ flexShrink: 0 }}>
                  View <ArrowRight size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
