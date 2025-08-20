import { db } from './server/db.js';
import { applications, offers, jobCosts, jobs } from './shared/schema.js';
import { eq, or } from 'drizzle-orm';

async function testDashboardData() {
  try {
    console.log('🔍 Testing Dashboard Data...\n');

    // Test 1: Check jobs
    console.log('1. Checking jobs...');
    const allJobs = await db.select().from(jobs);
    console.log(`   Total jobs: ${allJobs.length}`);
    console.log('   Jobs:', allJobs.map(j => ({ id: j.id, title: j.title, status: j.status })));

    // Test 2: Check applications with hired status
    console.log('\n2. Checking applications with hired status...');
    const hiredApplications = await db.select().from(applications).where(
      or(eq(applications.status, 'hired'), eq(applications.status, 'onboarded'))
    );
    console.log(`   Total hired applications: ${hiredApplications.length}`);
    console.log('   Hired applications:', hiredApplications.map(a => ({ 
      id: a.id, 
      jobId: a.jobId, 
      status: a.status, 
      hiredAt: a.hiredAt, 
      appliedAt: a.appliedAt,
      source: a.source
    })));

    // Test 3: Check offers
    console.log('\n3. Checking offers...');
    const allOffers = await db.select().from(offers);
    console.log(`   Total offers: ${allOffers.length}`);
    console.log('   Offers:', allOffers.map(o => ({ 
      id: o.id, 
      jobId: o.jobId, 
      accepted: o.accepted, 
      offeredAt: o.offeredAt 
    })));

    // Test 4: Check job costs
    console.log('\n4. Checking job costs...');
    const allJobCosts = await db.select().from(jobCosts);
    console.log(`   Total job costs: ${allJobCosts.length}`);
    console.log('   Job costs:', allJobCosts.map(jc => ({ 
      id: jc.id, 
      jobId: jc.jobId, 
      cost: jc.cost, 
      incurredAt: jc.incurredAt 
    })));

    // Test 5: Check applications by job
    console.log('\n5. Checking applications by job...');
    const jobIds = allJobs.map(j => j.id);
    console.log('   Job IDs:', jobIds);
    
    const applicationsByJob = await db.select().from(applications);
    console.log(`   Total applications: ${applicationsByJob.length}`);
    console.log('   Applications by job:', applicationsByJob.map(a => ({ 
      id: a.id, 
      jobId: a.jobId, 
      status: a.status 
    })));

    // Test 6: Check if hiredAt field exists and has data
    console.log('\n6. Checking hiredAt field...');
    const appsWithHiredAt = applicationsByJob.filter(a => a.hiredAt);
    console.log(`   Applications with hiredAt: ${appsWithHiredAt.length}`);
    console.log('   hiredAt values:', appsWithHiredAt.map(a => ({ 
      id: a.id, 
      hiredAt: a.hiredAt 
    })));

    // Test 7: Check source field
    console.log('\n7. Checking source field...');
    const appsWithSource = applicationsByJob.filter(a => a.source);
    console.log(`   Applications with source: ${appsWithSource.length}`);
    console.log('   Source values:', appsWithSource.map(a => ({ 
      id: a.id, 
      source: a.source 
    })));

  } catch (error) {
    console.error('❌ Error testing dashboard data:', error);
  } finally {
    process.exit(0);
  }
}

testDashboardData();
