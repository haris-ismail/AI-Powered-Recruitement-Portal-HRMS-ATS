import dotenv from 'dotenv';
dotenv.config();
import { Pool } from 'pg';

console.log('Testing assessment templates...');
console.log('DATABASE_URL:', process.env.DATABASE_URL);

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function testAssessmentTemplates() {
  try {
    const client = await pool.connect();
    console.log('✅ Database connection successful');
    
    // Check assessment templates table
    const templatesResult = await client.query('SELECT * FROM assessment_templates ORDER BY id DESC LIMIT 5');
    console.log('✅ Assessment templates found:', templatesResult.rows.length);
    templatesResult.rows.forEach((template, index) => {
      console.log(`Template ${index + 1}:`, {
        id: template.id,
        title: template.title,
        isActive: template.is_active,
        createdAt: template.created_at
      });
    });
    
    // Check if any templates are active
    const activeTemplates = templatesResult.rows.filter(t => t.is_active);
    console.log(`✅ Active templates: ${activeTemplates.length}`);
    
    // Check job_assessments table
    const jobAssessmentsResult = await client.query('SELECT * FROM job_assessments ORDER BY id DESC LIMIT 5');
    console.log('✅ Job assessments found:', jobAssessmentsResult.rows.length);
    
    // Check jobs table for assessmentTemplateId
    const jobsResult = await client.query('SELECT id, title, assessment_template_id FROM jobs WHERE assessment_template_id IS NOT NULL ORDER BY id DESC LIMIT 5');
    console.log('✅ Jobs with assessment templates:', jobsResult.rows.length);
    
    client.release();
    await pool.end();
    console.log('✅ Assessment templates test completed successfully');
  } catch (error) {
    console.error('❌ Assessment templates test failed:', error);
    process.exit(1);
  }
}

testAssessmentTemplates(); 