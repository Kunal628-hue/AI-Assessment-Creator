'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAssignmentStore, GeneratedPaper, Assignment } from '@/store/assignmentStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import LoadingOverlay from '@/components/LoadingOverlay';
import {
  ArrowLeft,
  Download,
  RefreshCw,
  Printer,
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function AssessmentViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'paper' | 'answers'>('paper');

  const {
    generationStatus,
    generationProgress,
    setGenerationStatus,
    setGenerationProgress,
    geminiApiKey,
  } = useAssignmentStore();

  const { subscribe } = useWebSocket();

  useEffect(() => {
    fetchAssignment();
    subscribe(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Poll for updates if processing
  useEffect(() => {
    if (generationStatus === 'completed') {
      // Refetch to get the generated paper
      setTimeout(() => fetchAssignment(), 1000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generationStatus]);

  const fetchAssignment = async () => {
    try {
      const res = await fetch(`${API_URL}/assignments/${id}`);
      const data = await res.json();
      if (data.success) {
        setAssignment(data.assignment);
        if (data.assignment.status === 'completed') {
          setGenerationStatus('completed');
          setGenerationProgress({ progress: 100, message: 'Done!' });
        } else if (data.assignment.status === 'processing' || data.assignment.status === 'pending') {
          setGenerationStatus('processing');
          // Start polling
          setTimeout(() => fetchAssignment(), 3000);
        }
      } else {
        setError('Assignment not found');
      }
    } catch (err) {
      console.error('Failed to fetch assignment:', err);
      setError('Failed to load assessment');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    setGenerationStatus('processing');
    setGenerationProgress({ progress: 5, message: 'Re-queuing generation...' });

    try {
      const res = await fetch(`${API_URL}/assignments/${id}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: geminiApiKey || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        subscribe(id);
        setAssignment((prev) => prev ? { ...prev, status: 'processing', generatedPaper: undefined } : prev);
        // Start polling
        setTimeout(() => fetchAssignment(), 3000);
      }
    } catch (err) {
      console.error('Regenerate failed:', err);
    } finally {
      setRegenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    window.open(`${API_URL}/assignments/${id}/pdf`, '_blank');
  };

  const getDifficultyBadgeClass = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'paper-badge-easy';
      case 'medium':
      case 'moderate': return 'paper-badge-medium';
      case 'hard': return 'paper-badge-hard';
      default: return 'paper-badge-medium';
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-primary)', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Loading assessment...</p>
        </div>
      </div>
    );
  }

  if (error || !assignment) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="glass-card" style={{ padding: 40, textAlign: 'center', maxWidth: 400 }}>
          <AlertCircle size={40} style={{ color: 'var(--error)', margin: '0 auto 16px' }} />
          <h3 style={{ marginBottom: 8 }}>Assessment Not Found</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>{error || 'This assessment does not exist or has been removed.'}</p>
          <button className="btn btn-primary" onClick={() => router.push('/')}>
            <ArrowLeft size={18} /> Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const isProcessing = assignment.status === 'processing' || assignment.status === 'pending';
  const paper = assignment.generatedPaper;

  return (
    <>
      <LoadingOverlay
        visible={isProcessing}
        progress={generationProgress.progress}
        message={generationProgress.message}
      />

      <div className="animate-fade-in paper-container">
        {/* Action Bar */}
        <div className="glass-card action-bar" style={{ marginBottom: 24 }}>
          <div className="action-bar-left">
            <button className="btn btn-ghost btn-sm" onClick={() => router.push('/')}>
              <ArrowLeft size={16} /> Back
            </button>
            <div style={{ width: 1, height: 24, background: 'var(--border-color)' }} />
            <div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{assignment.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {assignment.subject} · Class {assignment.grade}
              </div>
            </div>
          </div>
          <div className="action-bar-right">
            {paper && (
              <>
                <button className="btn btn-secondary btn-sm" onClick={handleRegenerate} disabled={regenerating}>
                  <RefreshCw size={16} className={regenerating ? 'spinning' : ''} />
                  Regenerate
                </button>
                <button className="btn btn-secondary btn-sm" onClick={handlePrint}>
                  <Printer size={16} />
                  Print
                </button>
                <button className="btn btn-primary btn-sm" onClick={handleDownloadPDF}>
                  <Download size={16} />
                  Download PDF
                </button>
              </>
            )}
          </div>
        </div>

        {/* Failed state */}
        {assignment.status === 'failed' && (
          <div className="glass-card" style={{ padding: 40, textAlign: 'center', marginBottom: 24 }}>
            <AlertCircle size={40} style={{ color: 'var(--error)', margin: '0 auto 16px' }} />
            <h3 style={{ marginBottom: 8 }}>Generation Failed</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
              {assignment.errorMessage || 'Something went wrong during question generation.'}
            </p>
            <button className="btn btn-primary" onClick={handleRegenerate}>
              <RefreshCw size={18} /> Try Again
            </button>
          </div>
        )}

        {/* Tab Switcher */}
        {paper && (
          <div style={{
            display: 'flex',
            background: 'var(--bg-glass)',
            border: '1px solid var(--border-color)',
            padding: 4,
            borderRadius: 'var(--radius-md)',
            marginBottom: 20,
            maxWidth: 320,
          }}>
            <button
              onClick={() => setActiveTab('paper')}
              className="btn btn-sm"
              style={{
                flex: 1,
                background: activeTab === 'paper' ? 'var(--accent-gradient)' : 'transparent',
                color: activeTab === 'paper' ? '#fff' : 'var(--text-secondary)',
                borderRadius: 'calc(var(--radius-md) - 2px)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Question Paper
            </button>
            <button
              onClick={() => setActiveTab('answers')}
              className="btn btn-sm"
              style={{
                flex: 1,
                background: activeTab === 'answers' ? 'var(--accent-gradient)' : 'transparent',
                color: activeTab === 'answers' ? '#fff' : 'var(--text-secondary)',
                borderRadius: 'calc(var(--radius-md) - 2px)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Answer Key
            </button>
          </div>
        )}

        {/* Question Paper */}
        {paper && (
          <div className="paper-wrapper animate-scale-in">
            {/* Paper Header */}
            <div className="paper-header">
              <div className="paper-institution">{paper.institutionName}</div>
              <div className="paper-exam-title">{paper.examTitle}</div>
              <div className="paper-meta">
                <div className="paper-meta-item">
                  <span className="paper-meta-label">Subject:</span>
                  <span>{paper.subject}</span>
                </div>
                <div className="paper-meta-item">
                  <span className="paper-meta-label">Class:</span>
                  <span>{paper.grade}</span>
                </div>
                <div className="paper-meta-item">
                  <span className="paper-meta-label">Date:</span>
                  <span>{paper.date}</span>
                </div>
                <div className="paper-meta-item">
                  <span className="paper-meta-label">Duration:</span>
                  <span>{paper.duration}</span>
                </div>
                <div className="paper-meta-item">
                  <span className="paper-meta-label">Total Marks:</span>
                  <span style={{ fontWeight: 700 }}>{paper.totalMarks}</span>
                </div>
              </div>
            </div>

            {/* Student Info */}
            <div className="paper-student-info">
              <div className="paper-student-field">
                <span className="paper-student-field-label">Name:</span>
                <div className="paper-student-field-line" />
              </div>
              <div className="paper-student-field">
                <span className="paper-student-field-label">Roll No:</span>
                <div className="paper-student-field-line" />
              </div>
              <div className="paper-student-field">
                <span className="paper-student-field-label">Section:</span>
                <div className="paper-student-field-line" />
              </div>
            </div>

            {/* General Instructions */}
            {paper.generalInstructions && paper.generalInstructions.length > 0 && (
              <div className="paper-instructions">
                <h3>General Instructions</h3>
                <ol>
                  {paper.generalInstructions.map((inst, i) => (
                    <li key={i}>{inst}</li>
                  ))}
                </ol>
              </div>
            )}

            {/* Sections */}
            {paper.sections.map((section, sIdx) => (
              <div key={sIdx} className="paper-section">
                <div className="paper-section-header">
                  <div className="paper-section-title">{section.title}</div>
                  <div className="paper-section-marks">{section.totalMarks} Marks</div>
                </div>
                <div className="paper-section-instruction">{section.instruction}</div>

                {section.questions.map((question, qIdx) => (
                  <div key={qIdx} className="paper-question">
                    <div className="paper-question-number">Q{question.questionNumber}.</div>
                    <div className="paper-question-content">
                      <div className="paper-question-text">{question.text}</div>

                      {/* MCQ Options */}
                      {question.options && question.options.length > 0 && (
                        <div className="paper-question-options">
                          {question.options.map((opt, oIdx) => (
                            <div key={oIdx} className="paper-question-option">{opt}</div>
                          ))}
                        </div>
                      )}

                      {/* Question meta */}
                      <div className="paper-question-meta">
                        <span className={getDifficultyBadgeClass(question.difficulty)}>
                          {question.difficulty}
                        </span>
                        <span className="paper-question-marks">[{question.marks} Mark{question.marks > 1 ? 's' : ''}]</span>
                      </div>

                      {activeTab === 'answers' && question.correctAnswer && (
                        <div style={{
                          marginTop: 12,
                          padding: '10px 14px',
                          background: '#f4fbf7',
                          borderLeft: '3px solid #10b981',
                          borderRadius: '0 4px 4px 0',
                          fontSize: 13,
                          color: '#14532d',
                          textAlign: 'left',
                          fontFamily: 'var(--font-family)',
                        }}>
                          <div style={{ fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <CheckCircle2 size={14} style={{ color: '#10b981' }} />
                            Correct Answer / Grading Rubric:
                          </div>
                          <div>{question.correctAnswer}</div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}

            {/* Footer */}
            <div style={{
              textAlign: 'center',
              padding: '24px 48px',
              borderTop: '2px solid #eee',
              fontSize: 13,
              color: '#999',
              fontStyle: 'italic',
            }}>
              ••• End of Question Paper •••
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .spinning {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}

// Error handling for missing params
function ErrorBoundary({ error }: { error: Error }) {
  return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <h2>Something went wrong</h2>
      <p>{error.message}</p>
    </div>
  );
}
