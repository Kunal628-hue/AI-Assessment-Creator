'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAssignmentStore } from '@/store/assignmentStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import LoadingOverlay from '@/components/LoadingOverlay';
import {
  Upload,
  X,
  Plus,
  Trash2,
  FileText,
  Sparkles,
  ChevronDown,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const questionTypeOptions = [
  { value: 'mcq', label: 'Multiple Choice (MCQ)' },
  { value: 'short_answer', label: 'Short Answer' },
  { value: 'long_answer', label: 'Long Answer / Essay' },
  { value: 'true_false', label: 'True or False' },
  { value: 'fill_in_blank', label: 'Fill in the Blanks' },
];

const subjectSuggestions = [
  'Mathematics', 'Science', 'Physics', 'Chemistry', 'Biology',
  'English', 'History', 'Geography', 'Computer Science', 'Economics',
];

const gradeSuggestions = [
  '6', '7', '8', '9', '10', '11', '12',
  'Undergraduate', 'Postgraduate',
];

export default function CreateAssessmentPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');

  const {
    formData,
    formErrors,
    generationStatus,
    generationProgress,
    updateFormField,
    addQuestionConfig,
    removeQuestionConfig,
    updateQuestionConfig,
    validateForm,
    resetForm,
    setGenerationStatus,
    setGenerationProgress,
    geminiApiKey,
  } = useAssignmentStore();

  const { subscribe } = useWebSocket();

  // File upload handlers
  const handleFileSelect = useCallback(async (file: File) => {
    updateFormField('uploadedFile', file);
    setUploadedFileName(file.name);

    // Upload to backend for text extraction
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      if (data.success && data.extractedText) {
        updateFormField('uploadedContent', data.extractedText);
      }
    } catch (err) {
      console.error('File upload failed:', err);
    }
  }, [updateFormField]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const removeFile = () => {
    updateFormField('uploadedFile', null);
    updateFormField('uploadedContent', '');
    setUploadedFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setGenerationStatus('processing');
    setGenerationProgress({ progress: 5, message: 'Creating assignment...' });

    try {
      const payload = {
        title: formData.title,
        subject: formData.subject,
        grade: formData.grade,
        dueDate: formData.dueDate,
        questionConfigs: formData.questionConfigs,
        difficultyDistribution: formData.difficultyDistribution,
        additionalInstructions: formData.additionalInstructions,
        uploadedContent: formData.uploadedContent || undefined,
        apiKey: geminiApiKey || undefined,
      };

      const res = await fetch(`${API_URL}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        const assignmentId = data.assignment._id;
        subscribe(assignmentId);

        // Wait a bit for the WebSocket to process, then redirect
        setTimeout(() => {
          router.push(`/assessment/${assignmentId}`);
        }, 1500);
      } else {
        setGenerationStatus('failed');
        setGenerationProgress({ progress: 0, message: data.error || 'Failed to create assignment' });
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error('Submit error:', err);
      setGenerationStatus('failed');
      setGenerationProgress({ progress: 0, message: 'Network error. Please try again.' });
      setIsSubmitting(false);
    }
  };

  // Calculate totals
  const totalQuestions = formData.questionConfigs.reduce((sum, qc) => sum + qc.count, 0);
  const totalMarks = formData.questionConfigs.reduce((sum, qc) => sum + qc.count * qc.marksPerQuestion, 0);

  return (
    <>
      <LoadingOverlay
        visible={generationStatus === 'processing'}
        progress={generationProgress.progress}
        message={generationProgress.message}
      />

      <div className="animate-fade-in" style={{ maxWidth: 880, margin: '0 auto' }}>
        {/* Page Header */}
        <div className="page-header">
          <h1>Create New Assessment</h1>
          <p>Fill in the details below and let AI generate your question paper.</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Section 1: Basic Info */}
          <div className="glass-card" style={{ padding: 32, marginBottom: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={20} style={{ color: 'var(--accent-primary)' }} />
              Basic Information
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Assessment Title *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., Mid-Term Examination 2024"
                  value={formData.title}
                  onChange={(e) => updateFormField('title', e.target.value)}
                />
                {formErrors.title && <span className="form-error">{formErrors.title}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Subject *</label>
                <select
                  className="form-select"
                  value={formData.subject}
                  onChange={(e) => updateFormField('subject', e.target.value)}
                >
                  <option value="">Select Subject</option>
                  {subjectSuggestions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                {formErrors.subject && <span className="form-error">{formErrors.subject}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Grade / Class *</label>
                <select
                  className="form-select"
                  value={formData.grade}
                  onChange={(e) => updateFormField('grade', e.target.value)}
                >
                  <option value="">Select Grade</option>
                  {gradeSuggestions.map((g) => (
                    <option key={g} value={g}>Class {g}</option>
                  ))}
                </select>
                {formErrors.grade && <span className="form-error">{formErrors.grade}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Due Date *</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.dueDate}
                  onChange={(e) => updateFormField('dueDate', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
                {formErrors.dueDate && <span className="form-error">{formErrors.dueDate}</span>}
              </div>
            </div>
          </div>

          {/* Section 2: File Upload */}
          <div className="glass-card" style={{ padding: 32, marginBottom: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Upload size={20} style={{ color: 'var(--accent-primary)' }} />
              Reference Material
              <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>(Optional)</span>
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              Upload a PDF or text file to guide the AI in generating relevant questions.
            </p>

            <div
              className={`file-upload-zone ${dragOver ? 'drag-over' : ''} ${uploadedFileName ? 'has-file' : ''}`}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.doc,.docx"
                onChange={handleFileInputChange}
                style={{ display: 'none' }}
              />

              {uploadedFileName ? (
                <>
                  <div className="file-upload-icon">
                    <CheckCircle2 size={48} />
                  </div>
                  <div className="file-upload-name">{uploadedFileName}</div>
                  <p className="file-upload-hint">File uploaded successfully</p>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={(e) => { e.stopPropagation(); removeFile(); }}
                    style={{ marginTop: 12 }}
                  >
                    <X size={14} /> Remove
                  </button>
                </>
              ) : (
                <>
                  <div className="file-upload-icon">
                    <Upload size={48} />
                  </div>
                  <p className="file-upload-text">
                    Drag & drop your file here, or <span>browse</span>
                  </p>
                  <p className="file-upload-hint">Supports PDF, TXT, DOC, DOCX (Max 10MB)</p>
                </>
              )}
            </div>
          </div>

          {/* Section 3: Question Configuration */}
          <div className="glass-card" style={{ padding: 32, marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={20} style={{ color: 'var(--accent-primary)' }} />
                Question Configuration
              </h2>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={addQuestionConfig}
              >
                <Plus size={16} /> Add Section
              </button>
            </div>

            {formErrors.questionConfigs && (
              <div style={{ padding: '12px 16px', background: 'var(--error-bg)', borderRadius: 'var(--radius-md)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--error)' }}>
                <AlertCircle size={16} />
                {formErrors.questionConfigs}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {formData.questionConfigs.map((qc, index) => (
                <div key={index} style={{
                  padding: 20,
                  background: 'var(--bg-glass)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <span style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: 'var(--accent-primary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}>
                      Section {String.fromCharCode(65 + index)}
                    </span>
                    {formData.questionConfigs.length > 1 && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => removeQuestionConfig(index)}
                        style={{ color: 'var(--error)', padding: '4px 8px' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16 }}>
                    <div className="form-group">
                      <label className="form-label">Question Type</label>
                      <select
                        className="form-select"
                        value={qc.type}
                        onChange={(e) => updateQuestionConfig(index, 'type', e.target.value)}
                      >
                        {questionTypeOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">No. of Questions</label>
                      <input
                        type="number"
                        className="form-input"
                        min="1"
                        max="50"
                        value={qc.count}
                        onChange={(e) => updateQuestionConfig(index, 'count', parseInt(e.target.value) || 0)}
                      />
                      {formErrors[`qc_${index}_count`] && (
                        <span className="form-error">{formErrors[`qc_${index}_count`]}</span>
                      )}
                    </div>

                    <div className="form-group">
                      <label className="form-label">Marks Each</label>
                      <input
                        type="number"
                        className="form-input"
                        min="1"
                        max="25"
                        value={qc.marksPerQuestion}
                        onChange={(e) => updateQuestionConfig(index, 'marksPerQuestion', parseInt(e.target.value) || 0)}
                      />
                      {formErrors[`qc_${index}_marks`] && (
                        <span className="form-error">{formErrors[`qc_${index}_marks`]}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div style={{
              marginTop: 20,
              padding: '16px 20px',
              background: 'var(--accent-gradient-subtle)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-accent)',
              display: 'flex',
              justifyContent: 'space-around',
              textAlign: 'center',
            }}>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent-primary)' }}>{totalQuestions}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Questions</div>
              </div>
              <div style={{ width: 1, background: 'var(--border-color)' }} />
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent-primary)' }}>{totalMarks}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Marks</div>
              </div>
              <div style={{ width: 1, background: 'var(--border-color)' }} />
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent-primary)' }}>{formData.questionConfigs.length}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sections</div>
              </div>
            </div>
          </div>

          {/* Section 4: Difficulty Distribution */}
          <div className="glass-card" style={{ padding: 32, marginBottom: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={20} style={{ color: 'var(--accent-primary)' }} />
              Difficulty Distribution
            </h2>

            {formErrors.difficulty && (
              <div style={{ padding: '12px 16px', background: 'var(--error-bg)', borderRadius: 'var(--radius-md)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--error)' }}>
                <AlertCircle size={16} />
                {formErrors.difficulty}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
              {(['easy', 'medium', 'hard'] as const).map((level) => (
                <div key={level} className="form-group">
                  <label className="form-label" style={{
                    color: level === 'easy' ? 'var(--easy)' : level === 'medium' ? 'var(--medium)' : 'var(--hard)',
                  }}>
                    {level.charAt(0).toUpperCase() + level.slice(1)} (%)
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    min="0"
                    max="100"
                    value={formData.difficultyDistribution[level]}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      updateFormField('difficultyDistribution', {
                        ...formData.difficultyDistribution,
                        [level]: val,
                      });
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Visual bar */}
            <div style={{
              marginTop: 16,
              height: 8,
              borderRadius: 'var(--radius-full)',
              overflow: 'hidden',
              display: 'flex',
              background: 'var(--bg-glass)',
            }}>
              <div style={{ width: `${formData.difficultyDistribution.easy}%`, background: 'var(--easy)', transition: 'width 0.3s' }} />
              <div style={{ width: `${formData.difficultyDistribution.medium}%`, background: 'var(--medium)', transition: 'width 0.3s' }} />
              <div style={{ width: `${formData.difficultyDistribution.hard}%`, background: 'var(--hard)', transition: 'width 0.3s' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
              <span>Easy {formData.difficultyDistribution.easy}%</span>
              <span>Medium {formData.difficultyDistribution.medium}%</span>
              <span>Hard {formData.difficultyDistribution.hard}%</span>
            </div>
          </div>

          {/* Section 5: Additional Instructions */}
          <div className="glass-card" style={{ padding: 32, marginBottom: 32 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={20} style={{ color: 'var(--accent-primary)' }} />
              Additional Instructions
              <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>(Optional)</span>
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
              Provide any specific topics, chapters, or instructions for the AI to follow.
            </p>
            <textarea
              className="form-textarea"
              placeholder="e.g., Focus on Chapter 3 and 4. Include application-based questions. Avoid questions from the appendix."
              value={formData.additionalInstructions}
              onChange={(e) => updateFormField('additionalInstructions', e.target.value)}
              rows={4}
            />
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, marginBottom: 40 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={resetForm}
            >
              Reset Form
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  Generate Assessment
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}


