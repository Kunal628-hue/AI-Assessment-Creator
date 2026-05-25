// ============================================================
// Shared Types for AI Assessment Creator
// ============================================================

// ---------- Enums ----------
export enum QuestionType {
  MCQ = 'mcq',
  SHORT_ANSWER = 'short_answer',
  LONG_ANSWER = 'long_answer',
  TRUE_FALSE = 'true_false',
  FILL_IN_BLANK = 'fill_in_blank',
}

export enum Difficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
}

export enum AssignmentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

// ---------- Question Config ----------
export interface QuestionConfig {
  type: QuestionType;
  count: number;
  marksPerQuestion: number;
}

// ---------- Difficulty Distribution ----------
export interface DifficultyDistribution {
  easy: number;   // percentage
  medium: number;
  hard: number;
}

// ---------- Assignment Creation ----------
export interface CreateAssignmentPayload {
  title: string;
  subject: string;
  grade: string;
  dueDate: string;
  questionConfigs: QuestionConfig[];
  difficultyDistribution: DifficultyDistribution;
  additionalInstructions: string;
  uploadedFileUrl?: string;
  uploadedContent?: string;
}

// ---------- Assignment (from DB) ----------
export interface Assignment {
  _id: string;
  title: string;
  subject: string;
  grade: string;
  dueDate: string;
  questionConfigs: QuestionConfig[];
  difficultyDistribution: DifficultyDistribution;
  additionalInstructions: string;
  uploadedFileUrl?: string;
  uploadedContent?: string;
  status: AssignmentStatus;
  generatedPaper?: GeneratedPaper;
  createdAt: string;
  updatedAt: string;
}

// ---------- Generated Paper ----------
export interface GeneratedQuestion {
  questionNumber: number;
  text: string;
  type: QuestionType;
  difficulty: Difficulty;
  marks: number;
  options?: string[];         // For MCQ
  correctAnswer?: string;     // Optional - for answer key
}

export interface PaperSection {
  sectionLabel: string;       // "A", "B", "C"
  title: string;              // "Section A - Multiple Choice Questions"
  instruction: string;        // "Attempt all questions. Each carries 1 mark."
  questionType: QuestionType;
  questions: GeneratedQuestion[];
  totalMarks: number;
}

export interface GeneratedPaper {
  institutionName: string;
  examTitle: string;
  subject: string;
  grade: string;
  date: string;
  duration: string;
  totalMarks: number;
  sections: PaperSection[];
  generalInstructions: string[];
}

// ---------- WebSocket Events ----------
export enum WSEventType {
  JOB_STARTED = 'job:started',
  JOB_PROGRESS = 'job:progress',
  JOB_COMPLETED = 'job:completed',
  JOB_FAILED = 'job:failed',
  CONNECTION_ACK = 'connection:ack',
}

export interface WSMessage {
  type: WSEventType;
  assignmentId: string;
  data?: {
    progress?: number;
    message?: string;
    paper?: GeneratedPaper;
    error?: string;
  };
}
