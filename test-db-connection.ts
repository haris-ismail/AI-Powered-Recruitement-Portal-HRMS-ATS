import dotenv from 'dotenv';
dotenv.config();
import { Pool } from 'pg';

console.log('Testing database connection...');
console.log('DATABASE_URL:', process.env.DATABASE_URL);

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('✅ Database connection successful');
    
    // Test a simple query
    const result = await client.query('SELECT COUNT(*) FROM users');
    console.log('✅ Query successful, user count:', result.rows[0].count);
    
    // Test applications table
    const applicationsResult = await client.query('SELECT COUNT(*) FROM applications');
    console.log('✅ Applications count:', applicationsResult.rows[0].count);
    
    // Test assessment tables
    const templatesResult = await client.query('SELECT COUNT(*) FROM assessment_templates');
    console.log('✅ Assessment templates count:', templatesResult.rows[0].count);
    
    const jobAssessmentsResult = await client.query('SELECT COUNT(*) FROM job_assessments');
    console.log('✅ Job assessments count:', jobAssessmentsResult.rows[0].count);
    
    client.release();
    await pool.end();
    console.log('✅ Database test completed successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

testConnection();
