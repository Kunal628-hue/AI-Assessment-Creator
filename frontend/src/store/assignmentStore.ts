import { create } from 'zustand';

// ---------- Types ----------
export interface QuestionConfig {
  type: string;
  count: number;
  marksPerQuestion: number;
}

export interface DifficultyDistribution {
  easy: number;
  medium: number;
  hard: number;
}

export interface FormData {
  title: string;
  subject: string;
  grade: string;
  dueDate: string;
  questionConfigs: QuestionConfig[];
  difficultyDistribution: DifficultyDistribution;
  additionalInstructions: string;
  uploadedFile: File | null;
  uploadedContent: string;
}

export interface GeneratedQuestion {
  questionNumber: number;
  text: string;
  type: string;
  difficulty: string;
  marks: number;
  options?: string[];
  correctAnswer?: string;
}

export interface PaperSection {
  sectionLabel: string;
  title: string;
  instruction: string;
  questionType: string;
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

export interface Assignment {
  _id: string;
  title: string;
  subject: string;
  grade: string;
  dueDate: string;
  questionConfigs: QuestionConfig[];
  difficultyDistribution: DifficultyDistribution;
  additionalInstructions: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  generatedPaper?: GeneratedPaper;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GenerationProgress {
  progress: number;
  message: string;
}

interface AssignmentStore {
  // Form state
  formData: FormData;
  formErrors: Record<string, string>;

  // Assignments list
  assignments: Assignment[];
  currentAssignment: Assignment | null;

  // Generation state
  generationStatus: 'idle' | 'processing' | 'completed' | 'failed';
  generationProgress: GenerationProgress;

  // Sidebar
  sidebarOpen: boolean;

  // Actions - Form
  updateFormField: <K extends keyof FormData>(field: K, value: FormData[K]) => void;
  addQuestionConfig: () => void;
  removeQuestionConfig: (index: number) => void;
  updateQuestionConfig: (index: number, field: keyof QuestionConfig, value: string | number) => void;
  resetForm: () => void;
  validateForm: () => boolean;

  // Actions - Assignments
  setAssignments: (assignments: Assignment[]) => void;
  setCurrentAssignment: (assignment: Assignment | null) => void;
  updateAssignmentStatus: (id: string, status: Assignment['status']) => void;

  // Actions - Generation
  setGenerationStatus: (status: 'idle' | 'processing' | 'completed' | 'failed') => void;
  setGenerationProgress: (progress: GenerationProgress) => void;

  // Actions - Sidebar
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  // Actions - Gemini API Key
  setGeminiApiKey: (key: string) => void;
  geminiApiKey: string;
}

const defaultFormData: FormData = {
  title: '',
  subject: '',
  grade: '',
  dueDate: '',
  questionConfigs: [
    { type: 'mcq', count: 5, marksPerQuestion: 1 },
    { type: 'short_answer', count: 5, marksPerQuestion: 2 },
    { type: 'long_answer', count: 3, marksPerQuestion: 5 },
  ],
  difficultyDistribution: { easy: 30, medium: 40, hard: 30 },
  additionalInstructions: '',
  uploadedFile: null,
  uploadedContent: '',
};

export const useAssignmentStore = create<AssignmentStore>((set, get) => ({
  // Initial state
  formData: { ...defaultFormData },
  formErrors: {},
  assignments: [],
  currentAssignment: null,
  generationStatus: 'idle',
  generationProgress: { progress: 0, message: '' },
  sidebarOpen: false,
  geminiApiKey: typeof window !== 'undefined' ? localStorage.getItem('vedaai_gemini_key') || '' : '',

  // Form actions
  updateFormField: (field, value) => {
    set((state) => ({
      formData: { ...state.formData, [field]: value },
      formErrors: { ...state.formErrors, [field]: '' },
    }));
  },

  addQuestionConfig: () => {
    set((state) => ({
      formData: {
        ...state.formData,
        questionConfigs: [
          ...state.formData.questionConfigs,
          { type: 'mcq', count: 5, marksPerQuestion: 1 },
        ],
      },
    }));
  },

  removeQuestionConfig: (index) => {
    set((state) => ({
      formData: {
        ...state.formData,
        questionConfigs: state.formData.questionConfigs.filter((_, i) => i !== index),
      },
    }));
  },

  updateQuestionConfig: (index, field, value) => {
    set((state) => {
      const configs = [...state.formData.questionConfigs];
      configs[index] = { ...configs[index], [field]: value };
      return {
        formData: { ...state.formData, questionConfigs: configs },
      };
    });
  },

  resetForm: () => {
    set({ formData: { ...defaultFormData }, formErrors: {} });
  },

  validateForm: () => {
    const { formData } = get();
    const errors: Record<string, string> = {};

    if (!formData.title.trim()) errors.title = 'Title is required';
    if (!formData.subject.trim()) errors.subject = 'Subject is required';
    if (!formData.grade.trim()) errors.grade = 'Grade is required';
    if (!formData.dueDate) errors.dueDate = 'Due date is required';

    if (formData.questionConfigs.length === 0) {
      errors.questionConfigs = 'At least one question type is required';
    }

    for (let i = 0; i < formData.questionConfigs.length; i++) {
      const qc = formData.questionConfigs[i];
      if (qc.count < 1) errors[`qc_${i}_count`] = 'Must be at least 1';
      if (qc.marksPerQuestion < 1) errors[`qc_${i}_marks`] = 'Must be at least 1';
    }

    const { easy, medium, hard } = formData.difficultyDistribution;
    if (easy + medium + hard !== 100) {
      errors.difficulty = 'Difficulty distribution must sum to 100%';
    }

    set({ formErrors: errors });
    return Object.keys(errors).length === 0;
  },

  // Assignment actions
  setAssignments: (assignments) => set({ assignments }),
  setCurrentAssignment: (assignment) => set({ currentAssignment: assignment }),

  updateAssignmentStatus: (id, status) => {
    set((state) => ({
      assignments: state.assignments.map((a) =>
        a._id === id ? { ...a, status } : a
      ),
      currentAssignment:
        state.currentAssignment?._id === id
          ? { ...state.currentAssignment, status }
          : state.currentAssignment,
    }));
  },

  // Generation actions
  setGenerationStatus: (status) => set({ generationStatus: status }),
  setGenerationProgress: (progress) => set({ generationProgress: progress }),

  // Sidebar actions
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // Gemini API Key actions
  setGeminiApiKey: (key) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('vedaai_gemini_key', key);
    }
    set({ geminiApiKey: key });
  },
}));
