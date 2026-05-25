import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { Assignment } from '../models/Assignment';
import { generateQuestionPaper } from '../services/aiService';
import { wsService } from '../services/websocketService';

let generationQueue: Queue;
let generationWorker: Worker;

export function initializeQueue(redisConnection: Redis): void {
  // Create the queue
  generationQueue = new Queue('assessment-generation', {
    connection: redisConnection,
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 50,
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 3000,
      },
    },
  });

  // Create the worker
  generationWorker = new Worker(
    'assessment-generation',
    async (job: Job) => {
      const { assignmentId } = job.data;
      console.log(`🔄 Processing job for assignment: ${assignmentId}`);

      try {
        // Update status to processing
        const assignment = await Assignment.findByIdAndUpdate(
          assignmentId,
          { status: 'processing' },
          { new: true }
        );

        if (!assignment) {
          throw new Error(`Assignment ${assignmentId} not found`);
        }

        // Notify clients: job started
        wsService.broadcast({
          type: 'job:started',
          assignmentId,
          data: { message: 'Generating question paper...', progress: 10 },
        });

        // Simulate progress stages
        await simulateProgress(assignmentId, 30, 'Analyzing requirements...');
        
        // Generate the question paper
        const paper = await generateQuestionPaper(assignment);

        await simulateProgress(assignmentId, 70, 'Structuring question paper...');

        // Store result in MongoDB
        assignment.generatedPaper = paper;
        assignment.status = 'completed';
        await assignment.save();

        await simulateProgress(assignmentId, 90, 'Finalizing...');

        // Notify clients: job completed
        wsService.broadcast({
          type: 'job:completed',
          assignmentId,
          data: {
            message: 'Question paper generated successfully!',
            progress: 100,
          },
        });

        console.log(`✅ Job completed for assignment: ${assignmentId}`);
        return { success: true, assignmentId };

      } catch (error) {
        console.error(`❌ Job failed for assignment: ${assignmentId}`, error);

        // Update status to failed
        await Assignment.findByIdAndUpdate(assignmentId, {
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        });

        // Notify clients: job failed
        wsService.broadcast({
          type: 'job:failed',
          assignmentId,
          data: {
            message: 'Failed to generate question paper',
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        });

        throw error;
      }
    },
    {
      connection: redisConnection,
      concurrency: 3,
    }
  );

  generationWorker.on('completed', (job: Job) => {
    console.log(`🎉 Worker completed job ${job.id}`);
  });

  generationWorker.on('failed', (job: Job | undefined, err: Error) => {
    console.error(`💥 Worker failed job ${job?.id}:`, err.message);
  });

  console.log('✅ BullMQ queue and worker initialized');
}

async function simulateProgress(assignmentId: string, progress: number, message: string): Promise<void> {
  wsService.broadcast({
    type: 'job:progress',
    assignmentId,
    data: { progress, message },
  });
  // Small delay to make progress feel realistic
  await new Promise((resolve) => setTimeout(resolve, 800));
}

export function getQueue(): Queue {
  return generationQueue;
}

export async function addGenerationJob(assignmentId: string): Promise<string> {
  const job = await generationQueue.add(
    'generate-paper',
    { assignmentId },
    {
      jobId: `gen-${assignmentId}-${Date.now()}`,
    }
  );
  console.log(`📝 Job ${job.id} added for assignment ${assignmentId}`);
  return job.id || '';
}
