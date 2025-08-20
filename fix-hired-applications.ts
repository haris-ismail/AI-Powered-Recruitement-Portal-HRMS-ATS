import dotenv from 'dotenv';
dotenv.config();
import { Pool } from 'pg';

console.log('🔧 Fixing hired applications...\n');
console.log('DATABASE_URL:', process.env.DATABASE_URL);

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function fixHiredApplications() {
  try {
    const client = await pool.connect();
    console.log('✅ Database connection successful\n');

    // Get all applications with hired or onboarded status that don't have hiredAt
    const hiredAppsResult = await client.query(
      "SELECT id, job_id, status, applied_at FROM applications WHERE status IN ('hired', 'onboarded') AND hired_at IS NULL"
    );
    
    console.log(`Found ${hiredAppsResult.rows.length} hired applications without hiredAt field`);
    
    if (hiredAppsResult.rows.length === 0) {
      console.log('✅ All hired applications already have hiredAt field');
      return;
    }

    // Update each application to set hiredAt to appliedAt + 30 days (simulating hiring process)
    for (const app of hiredAppsResult.rows) {
      const appliedAt = new Date(app.applied_at);
      const hiredAt = new Date(appliedAt.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days later
      
      await client.query(
        'UPDATE applications SET hired_at = $1 WHERE id = $2',
        [hiredAt, app.id]
      );
      
      console.log(`✅ Updated application ${app.id} (${app.status}): hiredAt set to ${hiredAt.toISOString()}`);
    }

    // Verify the updates
    const verifyResult = await client.query(
      "SELECT id, job_id, status, hired_at FROM applications WHERE status IN ('hired', 'onboarded')"
    );
    
    console.log('\n📊 Verification - All hired applications:');
    verifyResult.rows.forEach(app => {
      console.log(`   App ${app.id}: Job ${app.job_id}, Status: ${app.status}, HiredAt: ${app.hired_at}`);
    });

    client.release();
    await pool.end();
    console.log('\n✅ Hired applications fixed successfully');
  } catch (error) {
    console.error('❌ Error fixing hired applications:', error);
    process.exit(1);
  }
}

fixHiredApplications();
