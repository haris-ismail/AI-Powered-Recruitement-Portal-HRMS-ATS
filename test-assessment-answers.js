import dotenv from 'dotenv';
dotenv.config();
import { Pool } from 'pg';

console.log('Testing assessment answers...');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function testAssessmentAnswers() {
  try {
    const client = await pool.connect();
    console.log('✅ Database connection successful');
    
    // Check assessment answers table
    const answersResult = await client.query('SELECT * FROM assessment_answers ORDER BY id DESC LIMIT 10');
    console.log('✅ Assessment answers found:', answersResult.rows.length);
    
    if (answersResult.rows.length === 0) {
      console.log('❌ No assessment answers found in database');
    } else {
      answersResult.rows.forEach((answer, index) => {
        console.log(`Answer ${index + 1}:`, {
          id: answer.id,
          attemptId: answer.attempt_id,
          questionId: answer.question_id,
          answerText: answer.answer_text,
          isCorrect: answer.is_correct,
          pointsEarned: answer.points_earned,
          createdAt: answer.created_at
        });
      });
    }
    
    // Check the completed assessment attempt
    const completedAttempt = await client.query('SELECT * FROM assessment_attempts WHERE status = \'completed\' ORDER BY id DESC LIMIT 1');
    console.log('✅ Completed assessment attempts found:', completedAttempt.rows.length);
    
    if (completedAttempt.rows.length > 0) {
      const attempt = completedAttempt.rows[0];
      console.log('Completed attempt details:', {
        id: attempt.id,
        candidateId: attempt.candidate_id,
        templateId: attempt.template_id,
        jobId: attempt.job_id,
        status: attempt.status,
        score: attempt.score,
        maxScore: attempt.max_score,
        passed: attempt.passed,
        startedAt: attempt.started_at,
        completedAt: attempt.completed_at
      });
      
      // Check if there are answers for this attempt
      const attemptAnswers = await client.query('SELECT * FROM assessment_answers WHERE attempt_id = $1', [attempt.id]);
      console.log(`Answers for attempt ${attempt.id}:`, attemptAnswers.rows.length);
      
      if (attemptAnswers.rows.length === 0) {
        console.log('❌ No answers found for completed attempt - this indicates a problem with answer storage');
      }
    }
    
    // Check assessment questions for template 5 (the completed one)
    const questionsResult = await client.query('SELECT * FROM assessment_questions WHERE template_id = 5 ORDER BY order_index');
    console.log('✅ Questions for template 5 found:', questionsResult.rows.length);
    questionsResult.rows.forEach((question, index) => {
      console.log(`Question ${index + 1}:`, {
        id: question.id,
        questionText: question.question_text,
        questionType: question.question_type,
        options: question.options,
        correctAnswers: question.correct_answers,
        points: question.points,
        orderIndex: question.order_index
      });
    });
    
    client.release();
    await pool.end();
    console.log('✅ Assessment answers test completed');
  } catch (error) {
    console.error('❌ Assessment answers test failed:', error);
    process.exit(1);
  }
}

testAssessmentAnswers(); 