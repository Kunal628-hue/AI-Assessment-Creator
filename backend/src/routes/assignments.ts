import { Router, Request, Response } from 'express';
import { Assignment } from '../models/Assignment';
import { addGenerationJob } from '../queues/generationQueue';
import { generatePDF } from '../services/pdfService';

const router = Router();

// POST /api/assignments — Create a new assignment and queue generation
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      title,
      subject,
      grade,
      dueDate,
      questionConfigs,
      difficultyDistribution,
      additionalInstructions,
      uploadedFileUrl,
      uploadedContent,
    } = req.body;

    // Validation
    if (!title || !subject || !grade || !dueDate) {
      res.status(400).json({ error: 'Title, subject, grade, and due date are required.' });
      return;
    }

    if (!questionConfigs || !Array.isArray(questionConfigs) || questionConfigs.length === 0) {
      res.status(400).json({ error: 'At least one question configuration is required.' });
      return;
    }

    // Validate each question config
    for (const qc of questionConfigs) {
      if (!qc.type || !qc.count || !qc.marksPerQuestion) {
        res.status(400).json({ error: 'Each question config must have type, count, and marksPerQuestion.' });
        return;
      }
      if (qc.count < 1 || qc.marksPerQuestion < 1) {
        res.status(400).json({ error: 'Question count and marks must be positive numbers.' });
        return;
      }
    }

    // Validate difficulty distribution
    if (difficultyDistribution) {
      const { easy, medium, hard } = difficultyDistribution;
      if (easy + medium + hard !== 100) {
        res.status(400).json({ error: 'Difficulty distribution must sum to 100%.' });
        return;
      }
    }

    // Create assignment
    const assignment = new Assignment({
      title,
      subject,
      grade,
      dueDate: new Date(dueDate),
      questionConfigs,
      difficultyDistribution: difficultyDistribution || { easy: 30, medium: 40, hard: 30 },
      additionalInstructions: additionalInstructions || '',
      uploadedFileUrl,
      uploadedContent,
      status: 'pending',
    });

    await assignment.save();

    // Add to generation queue
    const jobId = await addGenerationJob(assignment._id.toString());

    res.status(201).json({
      success: true,
      assignment: assignment.toObject(),
      jobId,
      message: 'Assignment created and queued for generation.',
    });

  } catch (error) {
    console.error('Error creating assignment:', error);
    res.status(500).json({ error: 'Failed to create assignment.' });
  }
});

// GET /api/assignments — List all assignments
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const assignments = await Assignment.find()
      .select('-generatedPaper -uploadedContent')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, assignments });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ error: 'Failed to fetch assignments.' });
  }
});

// GET /api/assignments/:id — Get a single assignment with generated paper
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const assignment = await Assignment.findById(req.params.id).lean();

    if (!assignment) {
      res.status(404).json({ error: 'Assignment not found.' });
      return;
    }

    res.json({ success: true, assignment });
  } catch (error) {
    console.error('Error fetching assignment:', error);
    res.status(500).json({ error: 'Failed to fetch assignment.' });
  }
});

// POST /api/assignments/:id/regenerate — Re-queue generation
router.post('/:id/regenerate', async (req: Request, res: Response): Promise<void> => {
  try {
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      res.status(404).json({ error: 'Assignment not found.' });
      return;
    }

    // Reset status and clear old paper
    assignment.status = 'pending';
    assignment.generatedPaper = undefined;
    assignment.errorMessage = undefined;
    await assignment.save();

    // Re-queue
    const jobId = await addGenerationJob(assignment._id.toString());

    res.json({
      success: true,
      message: 'Regeneration queued.',
      jobId,
    });
  } catch (error) {
    console.error('Error regenerating:', error);
    res.status(500).json({ error: 'Failed to regenerate.' });
  }
});

// GET /api/assignments/:id/pdf — Download generated paper as PDF
router.get('/:id/pdf', async (req: Request, res: Response): Promise<void> => {
  try {
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      res.status(404).json({ error: 'Assignment not found.' });
      return;
    }

    if (assignment.status !== 'completed' || !assignment.generatedPaper) {
      res.status(400).json({ error: 'Question paper has not been generated yet.' });
      return;
    }

    const pdfBuffer = await generatePDF(assignment.generatedPaper);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${assignment.title.replace(/[^a-zA-Z0-9]/g, '_')}_question_paper.pdf"`
    );
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF.' });
  }
});

export default router;
