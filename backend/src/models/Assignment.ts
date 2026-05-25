import mongoose, { Schema, Document } from 'mongoose';

// ---------- Interfaces ----------
export interface IQuestionConfig {
  type: string;
  count: number;
  marksPerQuestion: number;
}

export interface IDifficultyDistribution {
  easy: number;
  medium: number;
  hard: number;
}

export interface IGeneratedQuestion {
  questionNumber: number;
  text: string;
  type: string;
  difficulty: string;
  marks: number;
  options?: string[];
  correctAnswer?: string;
}

export interface IPaperSection {
  sectionLabel: string;
  title: string;
  instruction: string;
  questionType: string;
  questions: IGeneratedQuestion[];
  totalMarks: number;
}

export interface IGeneratedPaper {
  institutionName: string;
  examTitle: string;
  subject: string;
  grade: string;
  date: string;
  duration: string;
  totalMarks: number;
  sections: IPaperSection[];
  generalInstructions: string[];
}

export interface IAssignment extends Document {
  title: string;
  subject: string;
  grade: string;
  dueDate: Date;
  questionConfigs: IQuestionConfig[];
  difficultyDistribution: IDifficultyDistribution;
  additionalInstructions: string;
  uploadedFileUrl?: string;
  uploadedContent?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  generatedPaper?: IGeneratedPaper;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ---------- Schemas ----------
const QuestionConfigSchema = new Schema<IQuestionConfig>({
  type: { type: String, required: true },
  count: { type: Number, required: true, min: 1 },
  marksPerQuestion: { type: Number, required: true, min: 1 },
}, { _id: false });

const DifficultyDistributionSchema = new Schema<IDifficultyDistribution>({
  easy: { type: Number, required: true, min: 0, max: 100 },
  medium: { type: Number, required: true, min: 0, max: 100 },
  hard: { type: Number, required: true, min: 0, max: 100 },
}, { _id: false });

const GeneratedQuestionSchema = new Schema<IGeneratedQuestion>({
  questionNumber: { type: Number, required: true },
  text: { type: String, required: true },
  type: { type: String, required: true },
  difficulty: { type: String, required: true },
  marks: { type: Number, required: true },
  options: [{ type: String }],
  correctAnswer: { type: String },
}, { _id: false });

const PaperSectionSchema = new Schema<IPaperSection>({
  sectionLabel: { type: String, required: true },
  title: { type: String, required: true },
  instruction: { type: String, required: true },
  questionType: { type: String, required: true },
  questions: [GeneratedQuestionSchema],
  totalMarks: { type: Number, required: true },
}, { _id: false });

const GeneratedPaperSchema = new Schema<IGeneratedPaper>({
  institutionName: { type: String, required: true },
  examTitle: { type: String, required: true },
  subject: { type: String, required: true },
  grade: { type: String, required: true },
  date: { type: String, required: true },
  duration: { type: String, required: true },
  totalMarks: { type: Number, required: true },
  sections: [PaperSectionSchema],
  generalInstructions: [{ type: String }],
}, { _id: false });

const AssignmentSchema = new Schema<IAssignment>({
  title: { type: String, required: true, trim: true },
  subject: { type: String, required: true, trim: true },
  grade: { type: String, required: true, trim: true },
  dueDate: { type: Date, required: true },
  questionConfigs: { type: [QuestionConfigSchema], required: true },
  difficultyDistribution: { type: DifficultyDistributionSchema, required: true },
  additionalInstructions: { type: String, default: '' },
  uploadedFileUrl: { type: String },
  uploadedContent: { type: String },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
  },
  generatedPaper: { type: GeneratedPaperSchema },
  errorMessage: { type: String },
}, {
  timestamps: true,
});

export const Assignment = mongoose.model<IAssignment>('Assignment', AssignmentSchema);
