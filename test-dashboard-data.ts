import dotenv from 'dotenv';
dotenv.config();
import { Pool } from 'pg';

console.log('🔍 Testing Dashboard Data...\n');
console.log('DATABASE_URL:', process.env.DATABASE_URL);

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function testDashboardData() {
  try {
    const client = await pool.connect();
    console.log('✅ Database connection successful\n');

    // Test 1: Check jobs
    console.log('1. Checking jobs...');
    const jobsResult = await client.query('SELECT id, title, status FROM jobs');
    console.log(`   Total jobs: ${jobsResult.rows.length}`);
    console.log('   Jobs:', jobsResult.rows.map(j => ({ id: j.id, title: j.title, status: j.status })));

    // Test 2: Check applications with hired status
    console.log('\n2. Checking applications with hired status...');
    const hiredApplicationsResult = await client.query(
      "SELECT id, job_id, status, hired_at, applied_at, source FROM applications WHERE status IN ('hired', 'onboarded')"
    );
    console.log(`   Total hired applications: ${hiredApplicationsResult.rows.length}`);
    console.log('   Hired applications:', hiredApplicationsResult.rows.map(a => ({ 
      id: a.id, 
      jobId: a.job_id, 
      status: a.status, 
      hiredAt: a.hired_at, 
      appliedAt: a.applied_at,
      source: a.source
    })));

    // Test 3: Check offers
    console.log('\n3. Checking offers...');
    const offersResult = await client.query('SELECT id, job_id, accepted, offered_at FROM offers');
    console.log(`   Total offers: ${offersResult.rows.length}`);
    console.log('   Offers:', offersResult.rows.map(o => ({ 
      id: o.id, 
      jobId: o.job_id, 
      accepted: o.accepted, 
      offeredAt: o.offered_at 
    })));

    // Test 4: Check job costs
    console.log('\n4. Checking job costs...');
    const jobCostsResult = await client.query('SELECT id, job_id, cost, incurred_at FROM job_costs');
    console.log(`   Total job costs: ${jobCostsResult.rows.length}`);
    console.log('   Job costs:', jobCostsResult.rows.map(jc => ({ 
      id: jc.id, 
      jobId: jc.job_id, 
      cost: jc.cost, 
      incurredAt: jc.incurred_at 
    })));

    // Test 5: Check all applications
    console.log('\n5. Checking all applications...');
    const allApplicationsResult = await client.query('SELECT id, job_id, status FROM applications');
    console.log(`   Total applications: ${allApplicationsResult.rows.length}`);
    console.log('   Applications by job:', allApplicationsResult.rows.map(a => ({ 
      id: a.id, 
      jobId: a.job_id, 
      status: a.status 
    })));

    // Test 6: Check if hiredAt field exists and has data
    console.log('\n6. Checking hiredAt field...');
    const appsWithHiredAtResult = await client.query(
      "SELECT id, hired_at FROM applications WHERE hired_at IS NOT NULL"
    );
    console.log(`   Applications with hiredAt: ${appsWithHiredAtResult.rows.length}`);
    console.log('   hiredAt values:', appsWithHiredAtResult.rows.map(a => ({ 
      id: a.id, 
      hiredAt: a.hired_at 
    })));

    // Test 7: Check source field
    console.log('\n7. Checking source field...');
    const appsWithSourceResult = await client.query(
      "SELECT id, source FROM applications WHERE source IS NOT NULL"
    );
    console.log(`   Applications with source: ${appsWithSourceResult.rows.length}`);
    console.log('   Source values:', appsWithSourceResult.rows.map(a => ({ 
      id: a.id, 
      source: a.source 
    })));

    // Test 8: Check applications by status
    console.log('\n8. Checking applications by status...');
    const statusCountResult = await client.query(
      "SELECT status, COUNT(*) as count FROM applications GROUP BY status"
    );
    console.log('   Applications by status:', statusCountResult.rows);

    client.release();
    await pool.end();
    console.log('\n✅ Dashboard data test completed successfully');
  } catch (error) {
    console.error('❌ Dashboard data test failed:', error);
    process.exit(1);
  }
}

testDashboardData();
