import { db } from './db.js';
import { candidates, skills, experience, education } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function testCandidateData() {
  try {
    console.log('Testing candidate data...');
    
    // Get all candidates
    const allCandidates = await db.select().from(candidates);
    console.log(`Total candidates: ${allCandidates.length}`);
    
    if (allCandidates.length > 0) {
      const firstCandidate = allCandidates[0];
      console.log('First candidate:', {
        id: firstCandidate.id,
        firstName: firstCandidate.firstName,
        lastName: firstCandidate.lastName,
        city: firstCandidate.city
      });
      
      // Check skills for first candidate
      const candidateSkills = await db.select().from(skills).where(eq(skills.candidateId, firstCandidate.id));
      console.log(`Skills for candidate ${firstCandidate.id}:`, candidateSkills);
      
      // Check experience for first candidate
      const candidateExperience = await db.select().from(experience).where(eq(experience.candidateId, firstCandidate.id));
      console.log(`Experience for candidate ${firstCandidate.id}:`, candidateExperience);
      
      // Check education for first candidate
      const candidateEducation = await db.select().from(education).where(eq(education.candidateId, firstCandidate.id));
      console.log(`Education for candidate ${firstCandidate.id}:`, candidateEducation);
    }
    
  } catch (error) {
    console.error('Error testing candidate data:', error);
  }
}

testCandidateData();
