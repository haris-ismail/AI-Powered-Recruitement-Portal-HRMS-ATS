import dotenv from 'dotenv';
dotenv.config();
import { Pool } from 'pg';

console.log('Testing assessment flow...');
console.log('DATABASE_URL:', process.env.DATABASE_URL);

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function testAssessmentFlow() {
  try {
    const client = await pool.connect();
    console.log('✅ Database connection successful');
    
    // Check assessment attempts table
    const attemptsResult = await client.query('SELECT * FROM assessment_attempts ORDER BY id DESC LIMIT 5');
    console.log('✅ Assessment attempts found:', attemptsResult.rows.length);
    attemptsResult.rows.forEach((attempt, index) => {
      console.log(`Attempt ${index + 1}:`, {
        id: attempt.id,
        candidateId: attempt.candidate_id,
        templateId: attempt.template_id,
        jobId: attempt.job_id,
        status: attempt.status,
        score: attempt.score,
        maxScore: attempt.max_score,
        passed: attempt.passed,
        createdAt: attempt.created_at
      });
    });
    
    // Check assessment answers table
    const answersResult = await client.query('SELECT * FROM assessment_answers ORDER BY id DESC LIMIT 5');
    console.log('✅ Assessment answers found:', answersResult.rows.length);
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
    
    // Check job assessments table
    const jobAssessmentsResult = await client.query('SELECT * FROM job_assessments ORDER BY id DESC LIMIT 5');
    console.log('✅ Job assessments found:', jobAssessmentsResult.rows.length);
    
    // Check assessment templates
    const templatesResult = await client.query('SELECT * FROM assessment_templates WHERE is_active = true ORDER BY id DESC LIMIT 5');
    console.log('✅ Active assessment templates found:', templatesResult.rows.length);
    
    // Check assessment questions
    const questionsResult = await client.query('SELECT * FROM assessment_questions ORDER BY id DESC LIMIT 5');
    console.log('✅ Assessment questions found:', questionsResult.rows.length);
    
    client.release();
    await pool.end();
    console.log('✅ Assessment flow test completed successfully');
  } catch (error) {
    console.error('❌ Assessment flow test failed:', error);
    process.exit(1);
  }
}

testAssessmentFlow(); 