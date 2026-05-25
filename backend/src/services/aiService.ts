import { GoogleGenerativeAI } from '@google/generative-ai';
import { IAssignment, IGeneratedPaper } from '../models/Assignment';
import dotenv from 'dotenv';

dotenv.config();

// Build a structured prompt from assignment data
function buildPrompt(assignment: IAssignment): string {
  const totalQuestions = assignment.questionConfigs.reduce((sum, qc) => sum + qc.count, 0);
  const totalMarks = assignment.questionConfigs.reduce(
    (sum, qc) => sum + qc.count * qc.marksPerQuestion, 0
  );

  const questionTypeNames: Record<string, string> = {
    mcq: 'Multiple Choice Questions',
    short_answer: 'Short Answer Questions',
    long_answer: 'Long Answer / Essay Questions',
    true_false: 'True or False Questions',
    fill_in_blank: 'Fill in the Blanks',
  };

  const sectionDetails = assignment.questionConfigs
    .map((qc, i) => {
      const label = String.fromCharCode(65 + i); // A, B, C...
      return `  - Section ${label}: ${qc.count} ${questionTypeNames[qc.type] || qc.type} questions, ${qc.marksPerQuestion} mark(s) each (Total: ${qc.count * qc.marksPerQuestion} marks)`;
    })
    .join('\n');

  const diffDist = assignment.difficultyDistribution;

  let contextContent = '';
  if (assignment.uploadedContent) {
    contextContent = `
REFERENCE MATERIAL (use this as context for generating questions):
---
${assignment.uploadedContent.substring(0, 8000)}
---
`;
  }

  return `You are an expert exam paper creator for educational institutions. Generate a structured question paper based on the following specifications.

EXAM DETAILS:
- Subject: ${assignment.subject}
- Grade/Class: ${assignment.grade}
- Title: ${assignment.title}
- Total Questions: ${totalQuestions}
- Total Marks: ${totalMarks}

SECTIONS REQUIRED:
${sectionDetails}

DIFFICULTY DISTRIBUTION:
- Easy: ${diffDist.easy}%
- Medium: ${diffDist.medium}%
- Hard: ${diffDist.hard}%

${assignment.additionalInstructions ? `ADDITIONAL INSTRUCTIONS FROM TEACHER:\n${assignment.additionalInstructions}\n` : ''}
${contextContent}

IMPORTANT OUTPUT RULES:
1. Return ONLY a valid JSON object (no markdown, no code fences, no explanation).
2. Distribute difficulty across questions according to the percentages above.
3. For MCQ questions, provide exactly 4 options labeled A, B, C, D.
4. Each question must be unique, clear, and grade-appropriate.
5. Questions should test different cognitive levels (recall, understanding, application, analysis).

OUTPUT JSON SCHEMA:
{
  "institutionName": "Academic Institution",
  "examTitle": "${assignment.title}",
  "subject": "${assignment.subject}",
  "grade": "${assignment.grade}",
  "date": "${new Date(assignment.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}",
  "duration": "3 Hours",
  "totalMarks": ${totalMarks},
  "generalInstructions": [
    "All questions are compulsory unless stated otherwise.",
    "Write neat and clean answers.",
    "Marks are indicated against each question."
  ],
  "sections": [
    {
      "sectionLabel": "A",
      "title": "Section A - Multiple Choice Questions",
      "instruction": "Choose the correct option for each question.",
      "questionType": "mcq",
      "totalMarks": 10,
      "questions": [
        {
          "questionNumber": 1,
          "text": "What is ...?",
          "type": "mcq",
          "difficulty": "easy",
          "marks": 1,
          "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"]
        }
      ]
    }
  ]
}

Generate the complete question paper now.`;
}

// Parse AI response into structured paper
function parseAIResponse(responseText: string): IGeneratedPaper {
  // Clean the response - remove markdown code fences if present
  let cleaned = responseText.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  const parsed = JSON.parse(cleaned);

  // Validate required fields
  if (!parsed.sections || !Array.isArray(parsed.sections)) {
    throw new Error('Invalid response: missing sections array');
  }

  // Ensure each section has valid questions
  for (const section of parsed.sections) {
    if (!section.questions || !Array.isArray(section.questions)) {
      throw new Error(`Invalid section ${section.sectionLabel}: missing questions`);
    }
    // Re-number questions sequentially within each section
    section.questions.forEach((q: { questionNumber: number }, idx: number) => {
      q.questionNumber = idx + 1;
    });
    // Calculate section total marks
    section.totalMarks = section.questions.reduce(
      (sum: number, q: { marks: number }) => sum + q.marks, 0
    );
  }

  // Recalculate total marks
  parsed.totalMarks = parsed.sections.reduce(
    (sum: number, s: { totalMarks: number }) => sum + s.totalMarks, 0
  );

  return parsed as IGeneratedPaper;
}

// Generate question paper using Gemini AI
export async function generateQuestionPaper(assignment: IAssignment): Promise<IGeneratedPaper> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    console.log('⚠️  No Gemini API key configured. Using mock generation.');
    return generateMockPaper(assignment);
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = buildPrompt(assignment);
  
  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();

  return parseAIResponse(text);
}

// Mock generation for testing without API key
function generateMockPaper(assignment: IAssignment): IGeneratedPaper {
  const sectionLabels = 'ABCDEFGH';
  const questionTypeNames: Record<string, string> = {
    mcq: 'Multiple Choice Questions',
    short_answer: 'Short Answer Questions',
    long_answer: 'Long Answer / Essay Questions',
    true_false: 'True or False Questions',
    fill_in_blank: 'Fill in the Blanks',
  };

  const sectionInstructions: Record<string, string> = {
    mcq: 'Choose the correct option for each question. Each question carries {marks} mark(s).',
    short_answer: 'Answer the following questions in 2-3 sentences. Each question carries {marks} mark(s).',
    long_answer: 'Answer the following questions in detail. Each question carries {marks} mark(s).',
    true_false: 'State whether the following statements are True or False. Each question carries {marks} mark(s).',
    fill_in_blank: 'Fill in the blanks with appropriate words. Each question carries {marks} mark(s).',
  };

  const difficulties: Array<'easy' | 'medium' | 'hard'> = ['easy', 'medium', 'hard'];
  const dist = assignment.difficultyDistribution;

  const sections = assignment.questionConfigs.map((qc, sIdx) => {
    const questions = [];
    for (let i = 0; i < qc.count; i++) {
      // Distribute difficulty based on percentages
      let diff: 'easy' | 'medium' | 'hard';
      const rand = Math.random() * 100;
      if (rand < dist.easy) diff = 'easy';
      else if (rand < dist.easy + dist.medium) diff = 'medium';
      else diff = 'hard';

      const question: Record<string, unknown> = {
        questionNumber: i + 1,
        text: getMockQuestion(assignment.subject, qc.type, i, diff),
        type: qc.type,
        difficulty: diff,
        marks: qc.marksPerQuestion,
      };

      if (qc.type === 'mcq') {
        question.options = [
          `A) ${getMockOption(assignment.subject, 0)}`,
          `B) ${getMockOption(assignment.subject, 1)}`,
          `C) ${getMockOption(assignment.subject, 2)}`,
          `D) ${getMockOption(assignment.subject, 3)}`,
        ];
      }

      questions.push(question);
    }

    return {
      sectionLabel: sectionLabels[sIdx] || String(sIdx + 1),
      title: `Section ${sectionLabels[sIdx]} — ${questionTypeNames[qc.type] || qc.type}`,
      instruction: (sectionInstructions[qc.type] || 'Attempt all questions.').replace('{marks}', String(qc.marksPerQuestion)),
      questionType: qc.type,
      questions,
      totalMarks: qc.count * qc.marksPerQuestion,
    };
  });

  const totalMarks = sections.reduce((sum, s) => sum + s.totalMarks, 0);

  return {
    institutionName: 'Academic Institution',
    examTitle: assignment.title,
    subject: assignment.subject,
    grade: assignment.grade,
    date: new Date(assignment.dueDate).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'long', year: 'numeric',
    }),
    duration: '3 Hours',
    totalMarks,
    generalInstructions: [
      'All questions are compulsory unless stated otherwise.',
      'Write neat and legible answers.',
      'Marks for each question are indicated on the right side.',
      'Read all questions carefully before attempting.',
      'Use of calculators is not permitted unless specified.',
    ],
    sections: sections as unknown as IGeneratedPaper['sections'],
  };
}

function getMockQuestion(subject: string, type: string, index: number, difficulty: string): string {
  const subjectQuestions: Record<string, Record<string, string[]>> = {
    Mathematics: {
      mcq: [
        'What is the value of π (pi) rounded to two decimal places?',
        'Which of the following is a prime number?',
        'The derivative of x² is:',
        'What is the area of a circle with radius 7 cm?',
        'The sum of angles in a triangle is:',
        'What is 15% of 200?',
        'Which of the following is an irrational number?',
        'The HCF of 12 and 18 is:',
      ],
      short_answer: [
        'Define the Pythagoras theorem and give one example.',
        'Explain the difference between permutation and combination.',
        'Find the roots of the equation x² - 5x + 6 = 0.',
        'What is the formula for compound interest? Explain each variable.',
        'Prove that √2 is an irrational number.',
      ],
      long_answer: [
        'Derive the quadratic formula from the standard form ax² + bx + c = 0. Show all steps clearly.',
        'A train travels 360 km at a uniform speed. If the speed had been 5 km/h more, it would have taken 1 hour less. Find the speed of the train.',
        'Prove that the sum of all angles of a triangle is 180°. Use suitable diagrams.',
      ],
      true_false: [
        'The square root of a negative number is always a real number.',
        'Every natural number is a whole number.',
        'The product of two irrational numbers is always irrational.',
        'A quadrilateral has four sides and four angles.',
        'Zero is a positive integer.',
      ],
      fill_in_blank: [
        'The value of sin(90°) is ____.',
        'A polygon with 8 sides is called an ____.',
        'The LCM of 4 and 6 is ____.',
        'In a right triangle, the longest side is called the ____.',
        'The decimal expansion of 1/3 is ____.',
      ],
    },
    Science: {
      mcq: [
        'Which gas is most abundant in Earth\'s atmosphere?',
        'What is the chemical formula for water?',
        'Which planet is known as the Red Planet?',
        'The SI unit of force is:',
        'Photosynthesis takes place in which part of the plant?',
      ],
      short_answer: [
        'Explain the process of photosynthesis in brief.',
        'What is Newton\'s Third Law of Motion? Give an example.',
        'Differentiate between mitosis and meiosis.',
        'What are the three states of matter? Explain with examples.',
      ],
      long_answer: [
        'Explain the structure of an atom with a suitable diagram. Describe the contributions of Bohr and Rutherford to the atomic model.',
        'Describe the water cycle in detail. Explain each stage with appropriate diagrams.',
      ],
      true_false: [
        'Sound can travel through a vacuum.',
        'DNA stands for Deoxyribonucleic Acid.',
        'The nucleus of an atom contains protons and electrons.',
        'Metals are generally good conductors of electricity.',
      ],
      fill_in_blank: [
        'The powerhouse of the cell is called the ____.',
        'The chemical symbol for Gold is ____.',
        'Light travels at a speed of ____ m/s in vacuum.',
        'The process of conversion of solid to gas is called ____.',
      ],
    },
  };

  // Default questions for any subject
  const defaultQuestions: Record<string, string[]> = {
    mcq: [
      `Which of the following best describes the concept of ${subject.toLowerCase()} fundamentals?`,
      `What is the primary principle behind ${subject.toLowerCase()} theory?`,
      `Which method is most commonly used in ${subject.toLowerCase()} analysis?`,
      `The term "${subject}" is derived from which language?`,
      `Which of the following is NOT a characteristic of ${subject.toLowerCase()}?`,
    ],
    short_answer: [
      `Define the core concepts of ${subject} in your own words.`,
      `Explain the importance of ${subject} in today's world.`,
      `List three key principles of ${subject} and briefly explain each.`,
      `What are the practical applications of ${subject}?`,
    ],
    long_answer: [
      `Discuss the historical evolution of ${subject} and its impact on modern society. Support your answer with relevant examples.`,
      `Critically analyze the fundamental theories in ${subject}. How do they apply to real-world scenarios?`,
    ],
    true_false: [
      `${subject} is considered one of the foundational disciplines in education.`,
      `The study of ${subject} requires no practical application.`,
      `Modern advancements have significantly changed how ${subject} is taught.`,
      `${subject} principles can be applied across multiple disciplines.`,
    ],
    fill_in_blank: [
      `The study of ${subject} began in the ____ century.`,
      `A key concept in ${subject} is ____.`,
      `The most widely used method in ${subject} is ____.`,
      `${subject} is closely related to the field of ____.`,
    ],
  };

  const questions = subjectQuestions[subject]?.[type] || defaultQuestions[type] || defaultQuestions.mcq;
  return questions[index % questions.length];
}

function getMockOption(subject: string, index: number): string {
  const options = [
    ['Correctly stated answer', 'Alternative concept', 'Common misconception', 'Unrelated term'],
    ['First principle', 'Second principle', 'Third principle', 'Fourth principle'],
    ['154 cm²', '44 cm²', '22 cm²', '308 cm²'],
    ['Nitrogen', 'Oxygen', 'Carbon Dioxide', 'Hydrogen'],
  ];
  const set = options[Math.floor(Math.random() * options.length)];
  return set[index % set.length];
}
