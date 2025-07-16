import { 
  users, candidates, education, experience, jobTemplates, jobs, applications, emailTemplates, candidateNotes, candidateReviews, skills,
  type User, type InsertUser, type Candidate, type InsertCandidate,
  type Education, type InsertEducation, type Experience, type InsertExperience,
  type JobTemplate, type InsertJobTemplate, type Job, type InsertJob,
  type Application, type InsertApplication, type EmailTemplate, type InsertEmailTemplate,
  type CandidateNote, type InsertCandidateNote,
  type CandidateReview, type InsertCandidateReview,
  type Skill, type InsertSkill,
  assessmentCategories, assessmentTemplates, assessmentQuestions, jobAssessments, assessmentAttempts,
  assessmentAnswers
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

// Only method signatures in IStorage
export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getCandidate(userId: number): Promise<Candidate | undefined>;
  getCandidateById(id: number): Promise<Candidate | undefined>;
  createCandidate(candidate: InsertCandidate): Promise<Candidate>;
  updateCandidate(id: number, candidate: Partial<InsertCandidate>): Promise<Candidate>;
  getCandidateEducation(candidateId: number): Promise<Education[]>;
  createEducation(education: InsertEducation): Promise<Education>;
  updateEducation(id: number, education: Partial<InsertEducation>): Promise<Education>;
  deleteEducation(id: number): Promise<void>;
  getCandidateExperience(candidateId: number): Promise<Experience[]>;
  createExperience(experience: InsertExperience): Promise<Experience>;
  updateExperience(id: number, experience: Partial<InsertExperience>): Promise<Experience>;
  deleteExperience(id: number): Promise<void>;
  getJobTemplates(): Promise<JobTemplate[]>;
  createJobTemplate(template: InsertJobTemplate): Promise<JobTemplate>;
  deleteJobTemplate(id: number): Promise<void>;
  getJobs(): Promise<Job[]>;
  getJob(id: number): Promise<Job | undefined>;
  createJob(job: InsertJob): Promise<Job>;
  updateJob(id: number, job: Partial<InsertJob>): Promise<Job>;
  getApplications(): Promise<Application[]>;
  getApplicationsByJob(jobId: number): Promise<Application[]>;
  getApplicationsByCandidate(candidateId: number): Promise<Application[]>;
  createApplication(application: InsertApplication): Promise<Application>;
  updateApplication(id: number, application: Partial<InsertApplication>): Promise<Application>;
  getEmailTemplates(): Promise<EmailTemplate[]>;
  createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate>;
  getJobStats(): Promise<any>;
  getCandidateWithProfile(candidateId: number): Promise<any>;
  getCandidateNotes(candidateId: number): Promise<CandidateNote[]>;
  createCandidateNote(note: InsertCandidateNote): Promise<CandidateNote>;
  updateCandidateNote(id: number, note: Partial<InsertCandidateNote>): Promise<CandidateNote>;
  deleteCandidateNote(id: number): Promise<void>;
  getCandidateReviews(applicationId: number, stage?: string): Promise<CandidateReview[]>;
  createCandidateReview(review: InsertCandidateReview): Promise<CandidateReview>;
  updateCandidateReview(id: number, review: Partial<InsertCandidateReview>): Promise<CandidateReview>;
  deleteCandidateReview(id: number): Promise<void>;
  getCandidateByCnic(cnic: string): Promise<Candidate | undefined>;
  getCandidateSkills(candidateId: number): Promise<Skill[]>;
  createSkill(skill: InsertSkill): Promise<Skill>;
  updateSkill(id: number, skill: Partial<InsertSkill>): Promise<Skill>;
  deleteSkill(id: number): Promise<void>;
  getAssessmentCategories(): Promise<any[]>;
  createAssessmentCategory(data: any): Promise<any>;
  getAssessmentTemplates(): Promise<any[]>;
  createAssessmentTemplate(data: any): Promise<any>;
  updateAssessmentTemplate(id: number, data: any): Promise<any>;
  deleteAssessmentTemplate(id: number): Promise<void>;
  getAssessmentQuestions(templateId: number): Promise<any[]>;
  createAssessmentQuestion(templateId: number, data: any): Promise<any>;
  updateAssessmentQuestion(id: number, data: any): Promise<any>;
  deleteAssessmentQuestion(id: number): Promise<void>;
  getJobAssessments(jobId: number): Promise<any[]>;
  createJobAssessment(jobId: number, data: any): Promise<any>;
  deleteJobAssessment(id: number): Promise<void>;
  getPendingAssessments(candidateId: number): Promise<any[]>;
  startAssessment(templateId: number, candidateId: number, jobId?: number): Promise<any>;
  submitAssessment(attemptId: number, data: any): Promise<any>;
  getAssessmentResults(attemptId: number): Promise<any>;
  getAllAssessmentResults(): Promise<any[]>;
  reviewShortAnswer(attemptId: number, questionId: number, isCorrect: boolean, pointsEarned: number): Promise<any>;
  getAssessmentAnalytics(): Promise<any>;
  getCandidateAssessments(candidateId: number): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    return await db.select().from(users).where(eq(users.id, id)).then(rows => rows[0]);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return await db.select().from(users).where(eq(users.email, email)).then(rows => rows[0]);
  }

  async createUser(user: InsertUser): Promise<User> {
    const [row] = await db.insert(users).values(user).returning();
    return row;
  }

  async getCandidate(userId: number): Promise<Candidate | undefined> {
    return await db.select().from(candidates).where(eq(candidates.userId, userId)).then(rows => rows[0]);
  }

  async getCandidateById(id: number): Promise<Candidate | undefined> {
    return await db.select().from(candidates).where(eq(candidates.id, id)).then(rows => rows[0]);
  }

  async createCandidate(candidate: InsertCandidate): Promise<Candidate> {
    const [row] = await db.insert(candidates).values(candidate).returning();
    return row;
  }

  async updateCandidate(id: number, candidate: Partial<InsertCandidate>): Promise<Candidate> {
    const [row] = await db.update(candidates).set(candidate).where(eq(candidates.id, id)).returning();
    return row;
  }

  async getCandidateEducation(candidateId: number): Promise<Education[]> {
    return await db.select().from(education).where(eq(education.candidateId, candidateId));
  }

  async createEducation(educationData: InsertEducation): Promise<Education> {
    const [row] = await db.insert(education).values(educationData).returning();
    return row;
  }

  async updateEducation(id: number, educationData: Partial<InsertEducation>): Promise<Education> {
    const [row] = await db.update(education).set(educationData).where(eq(education.id, id)).returning();
    return row;
  }

  async deleteEducation(id: number): Promise<void> {
    await db.delete(education).where(eq(education.id, id));
  }

  async getCandidateExperience(candidateId: number): Promise<Experience[]> {
    return await db.select().from(experience).where(eq(experience.candidateId, candidateId));
  }

  async createExperience(experienceData: InsertExperience): Promise<Experience> {
    const [row] = await db.insert(experience).values(experienceData).returning();
    return row;
  }

  async updateExperience(id: number, experienceData: Partial<InsertExperience>): Promise<Experience> {
    const [row] = await db.update(experience).set(experienceData).where(eq(experience.id, id)).returning();
    return row;
  }

  async deleteExperience(id: number): Promise<void> {
    await db.delete(experience).where(eq(experience.id, id));
  }

  async getJobTemplates(): Promise<JobTemplate[]> {
    return await db.select().from(jobTemplates);
  }

  async createJobTemplate(template: InsertJobTemplate): Promise<JobTemplate> {
    const [row] = await db.insert(jobTemplates).values(template).returning();
    return row;
  }

  async deleteJobTemplate(id: number): Promise<void> {
    await db.delete(jobTemplates).where(eq(jobTemplates.id, id));
  }

  async getJobs(): Promise<Job[]> {
    return await db.select().from(jobs);
  }

  async getJob(id: number): Promise<Job | undefined> {
    return await db.select().from(jobs).where(eq(jobs.id, id)).then(rows => rows[0]);
  }

  async createJob(job: InsertJob): Promise<Job> {
    const [row] = await db.insert(jobs).values(job).returning();
    return row;
  }

  async updateJob(id: number, job: Partial<InsertJob>): Promise<Job> {
    const [row] = await db.update(jobs).set(job).where(eq(jobs.id, id)).returning();
    return row;
  }

  async getApplications(): Promise<Application[]> {
    return await db.select().from(applications);
  }

  async getApplicationsByJob(jobId: number): Promise<Application[]> {
    return await db.select().from(applications).where(eq(applications.jobId, jobId));
  }

  async getApplicationsByCandidate(candidateId: number): Promise<Application[]> {
    return await db.select().from(applications).where(eq(applications.candidateId, candidateId));
  }

  async createApplication(application: InsertApplication): Promise<Application> {
    const [row] = await db.insert(applications).values(application).returning();
    return row;
  }

  async updateApplication(id: number, application: Partial<InsertApplication>): Promise<Application> {
    const [row] = await db.update(applications).set(application).where(eq(applications.id, id)).returning();
    return row;
  }

  async getEmailTemplates(): Promise<EmailTemplate[]> {
    return await db.select().from(emailTemplates);
  }

  async createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate> {
    const [row] = await db.insert(emailTemplates).values(template).returning();
    return row;
  }

  async getJobStats(): Promise<any> {
    const jobsCount = await db.select().from(jobs).then(rows => rows.length);
    const candidatesCount = await db.select().from(candidates).then(rows => rows.length);
    return { totalJobs: jobsCount, totalCandidates: candidatesCount };
  }

  async getCandidateWithProfile(candidateId: number): Promise<any> {
    const candidate = await db.select().from(candidates).where(eq(candidates.id, candidateId)).then(rows => rows[0]);
    if (!candidate) return null;
    const educationList = await db.select().from(education).where(eq(education.candidateId, candidateId));
    const experienceList = await db.select().from(experience).where(eq(experience.candidateId, candidateId));
    return { ...candidate, education: educationList, experience: experienceList };
  }

  async getCandidateNotes(candidateId: number): Promise<CandidateNote[]> {
    return await db.select().from(candidateNotes).where(eq(candidateNotes.candidateId, candidateId));
  }

  async createCandidateNote(note: InsertCandidateNote): Promise<CandidateNote> {
    const [row] = await db.insert(candidateNotes).values(note).returning();
    return row;
  }

  async updateCandidateNote(id: number, note: Partial<InsertCandidateNote>): Promise<CandidateNote> {
    const [row] = await db.update(candidateNotes).set(note).where(eq(candidateNotes.id, id)).returning();
    return row;
  }

  async deleteCandidateNote(id: number): Promise<void> {
    await db.delete(candidateNotes).where(eq(candidateNotes.id, id));
  }

  async getCandidateReviews(applicationId: number, stage?: string): Promise<CandidateReview[]> {
    const query = eq(candidateReviews.applicationId, applicationId);
    if (stage) {
      // If you need to add more conditions, use 'and' from drizzle-orm
      // query = and(query, eq(candidateReviews.stage, stage));
    }
    return await db.select().from(candidateReviews).where(query);
  }

  async createCandidateReview(review: InsertCandidateReview): Promise<CandidateReview> {
    const [row] = await db.insert(candidateReviews).values(review).returning();
    return row;
  }

  async updateCandidateReview(id: number, review: Partial<InsertCandidateReview>): Promise<CandidateReview> {
    const [row] = await db.update(candidateReviews).set(review).where(eq(candidateReviews.id, id)).returning();
    return row;
  }

  async deleteCandidateReview(id: number): Promise<void> {
    await db.delete(candidateReviews).where(eq(candidateReviews.id, id));
  }

  async getCandidateByCnic(cnic: string): Promise<Candidate | undefined> {
    const [candidate] = await db.select().from(candidates).where(eq(candidates.cnic, cnic));
    return candidate || undefined;
  }

  async getCandidateSkills(candidateId: number): Promise<Skill[]> {
    return await db.select().from(skills).where(eq(skills.candidateId, candidateId));
  }

  async createSkill(skill: InsertSkill): Promise<Skill> {
    const [newSkill] = await db.insert(skills).values(skill).returning();
    return newSkill;
  }

  async updateSkill(id: number, skill: Partial<InsertSkill>): Promise<Skill> {
    const [updated] = await db.update(skills).set(skill).where(eq(skills.id, id)).returning();
    return updated;
  }

  async deleteSkill(id: number): Promise<void> {
    await db.delete(skills).where(eq(skills.id, id));
  }

  async getAssessmentCategories(): Promise<any[]> {
    return await db.select().from(assessmentCategories);
  }

  async createAssessmentCategory(data: any): Promise<any> {
    const [row] = await db.insert(assessmentCategories).values(data).returning();
    return row;
  }

  async getAssessmentTemplates(): Promise<any[]> {
    return await db.select().from(assessmentTemplates);
  }

  async createAssessmentTemplate(data: any): Promise<any> {
    const [row] = await db.insert(assessmentTemplates).values(data).returning();
    return row;
  }

  async updateAssessmentTemplate(id: number, data: any): Promise<any> {
    const [row] = await db.update(assessmentTemplates).set(data).where(eq(assessmentTemplates.id, id)).returning();
    return row;
  }

  async deleteAssessmentTemplate(id: number): Promise<void> {
    await db.delete(assessmentTemplates).where(eq(assessmentTemplates.id, id));
  }

  async getAssessmentQuestions(templateId: number): Promise<any[]> {
    return await db.select().from(assessmentQuestions).where(eq(assessmentQuestions.templateId, templateId));
  }

  async createAssessmentQuestion(templateId: number, data: any): Promise<any> {
    const [row] = await db.insert(assessmentQuestions).values({ ...data, templateId }).returning();
    return row;
  }

  async updateAssessmentQuestion(id: number, data: any): Promise<any> {
    const [row] = await db.update(assessmentQuestions).set(data).where(eq(assessmentQuestions.id, id)).returning();
    return row;
  }

  async deleteAssessmentQuestion(id: number): Promise<void> {
    await db.delete(assessmentQuestions).where(eq(assessmentQuestions.id, id));
  }

  async getJobAssessments(jobId: number): Promise<any[]> {
    return await db.select().from(jobAssessments).where(eq(jobAssessments.jobId, jobId));
  }

  async createJobAssessment(jobId: number, data: any): Promise<any> {
    const [row] = await db.insert(jobAssessments).values({ ...data, jobId }).returning();
    return row;
  }

  async deleteJobAssessment(id: number): Promise<void> {
    await db.delete(jobAssessments).where(eq(jobAssessments.id, id));
  }

  async getPendingAssessments(candidateId: number): Promise<any[]> {
    // Return all assessments assigned to candidate that are not completed/expired
    // (This is a placeholder, you may want to join with job_assessments, etc.)
    return await db.select().from(assessmentAttempts).where(and(eq(assessmentAttempts.candidateId, candidateId), eq(assessmentAttempts.status, "in_progress")));
  }

  async startAssessment(templateId: number, candidateId: number, jobId?: number): Promise<any> {
    // Prevent multiple attempts
    const existing = await db.select().from(assessmentAttempts)
      .where(and(
        eq(assessmentAttempts.candidateId, candidateId),
        eq(assessmentAttempts.templateId, templateId),
        jobId ? eq(assessmentAttempts.jobId, jobId) : undefined,
        // Only allow if not completed/expired
        eq(assessmentAttempts.status, "in_progress")
      ));
    if (existing.length > 0) {
      return { attemptId: existing[0].id, status: existing[0].status };
    }
    // Create new attempt
    const [attempt] = await db.insert(assessmentAttempts).values({
      candidateId,
      templateId,
      jobId,
      startedAt: new Date(),
      status: "in_progress",
      createdAt: new Date(),
    }).returning();
    return { attemptId: attempt.id, status: attempt.status };
  }

  async submitAssessment(attemptId: number, data: any): Promise<any> {
    // Fetch attempt, template, and questions
    const [attempt] = await db.select().from(assessmentAttempts).where(eq(assessmentAttempts.id, attemptId));
    if (!attempt) throw new Error("Attempt not found");
    // Enforce time limit
    const [template] = await db.select().from(assessmentTemplates).where(eq(assessmentTemplates.id, attempt.templateId));
    if (!template) throw new Error("Template not found");
    const now = new Date();
    const started = attempt.startedAt;
    const durationMs = (template.durationMinutes || 0) * 60 * 1000;
    if (started && durationMs && now.getTime() > new Date(started).getTime() + durationMs) {
      // Expired
      await db.update(assessmentAttempts).set({ status: "expired", completedAt: now }).where(eq(assessmentAttempts.id, attemptId));
      return { status: "expired" };
    }
    // Secure scoring logic
    const questions = await db.select().from(assessmentQuestions).where(eq(assessmentQuestions.templateId, attempt.templateId));
    let score = 0;
    let maxScore = 0;
    for (const q of questions) {
      maxScore += q.points;
      const answer = data.answers?.[q.id];
      // Only check server-side
      if (q.questionType === "mcq_single" || q.questionType === "true_false") {
        if (answer && JSON.stringify(answer) === JSON.stringify(q.correctAnswers)) score += q.points;
      } else if (q.questionType === "mcq_multiple") {
        if (answer && Array.isArray(answer) && Array.isArray(q.correctAnswers) && JSON.stringify([...answer].sort()) === JSON.stringify([...(q.correctAnswers || [])].sort())) score += q.points;
      } else if (q.questionType === "short_answer") {
        // Optionally implement short answer checking
      }
    }
    // Mark as completed
    await db.update(assessmentAttempts).set({ status: "completed", completedAt: now, score, maxScore, passed: score >= template.passingScore }).where(eq(assessmentAttempts.id, attemptId));
    return { status: "completed", score, maxScore, passed: score >= template.passingScore };
  }

  async getAssessmentResults(attemptId: number): Promise<any> {
    // Get attempt, questions, and answers
    const [attempt] = await db.select().from(assessmentAttempts).where(eq(assessmentAttempts.id, attemptId));
    if (!attempt) throw new Error("Attempt not found");
    const questions = await db.select().from(assessmentQuestions).where(eq(assessmentQuestions.templateId, attempt.templateId));
    const answers = await db.select().from(assessmentAnswers).where(eq(assessmentAnswers.attemptId, attemptId));
    // Map answers by questionId
    const answerMap = Object.fromEntries(answers.map(a => [a.questionId, a]));
    // Build result
    return {
      score: attempt.score,
      maxScore: attempt.maxScore,
      passed: attempt.passed,
      status: attempt.status,
      questions: questions.map(q => ({
        id: q.id,
        questionText: q.questionText,
        questionType: q.questionType,
        options: q.options,
        correctAnswers: q.correctAnswers,
        points: q.points,
        yourAnswer: answerMap[q.id]?.answerText,
        isCorrect: answerMap[q.id]?.isCorrect,
        pointsEarned: answerMap[q.id]?.pointsEarned,
        reviewStatus: q.questionType === 'short_answer' ? (answerMap[q.id]?.isCorrect === null ? 'pending' : 'reviewed') : undefined
      }))
    };
  }

  async getAllAssessmentResults(): Promise<any[]> {
    // Return all completed attempts with short answer review status
    const attempts = await db.select().from(assessmentAttempts).where(eq(assessmentAttempts.status, 'completed'));
    const results = [];
    for (const attempt of attempts) {
      const questions = await db.select().from(assessmentQuestions).where(eq(assessmentQuestions.templateId, attempt.templateId));
      const answers = await db.select().from(assessmentAnswers).where(eq(assessmentAnswers.attemptId, attempt.id));
      const answerMap = Object.fromEntries(answers.map(a => [a.questionId, a]));
      results.push({
        attemptId: attempt.id,
        candidateId: attempt.candidateId,
        templateId: attempt.templateId,
        score: attempt.score,
        maxScore: attempt.maxScore,
        passed: attempt.passed,
        status: attempt.status,
        questions: questions.map(q => ({
          id: q.id,
          questionText: q.questionText,
          questionType: q.questionType,
          yourAnswer: answerMap[q.id]?.answerText,
          isCorrect: answerMap[q.id]?.isCorrect,
          pointsEarned: answerMap[q.id]?.pointsEarned,
          reviewStatus: q.questionType === 'short_answer' ? (answerMap[q.id]?.isCorrect === null ? 'pending' : 'reviewed') : undefined
        }))
      });
    }
    return results;
  }

  async reviewShortAnswer(attemptId: number, questionId: number, isCorrect: boolean, pointsEarned: number): Promise<any> {
    // Update the answer for the short answer question
    await db.update(assessmentAnswers)
      .set({ isCorrect, pointsEarned })
      .where(and(eq(assessmentAnswers.attemptId, attemptId), eq(assessmentAnswers.questionId, questionId)));
    // Optionally, recalculate the attempt's total score
    const answers = await db.select().from(assessmentAnswers).where(eq(assessmentAnswers.attemptId, attemptId));
    let score = 0;
    for (const a of answers) {
      score += a.pointsEarned || 0;
    }
    await db.update(assessmentAttempts).set({ score }).where(eq(assessmentAttempts.id, attemptId));
    return { success: true };
  }

  // Assessment Analytics
  async getAssessmentAnalytics(): Promise<any> {
    // Average score and pass rate per template
    const avgScores = await db.execute(`
      SELECT template_id, AVG(score) as avg_score, COUNT(*) FILTER (WHERE passed) * 100.0 / NULLIF(COUNT(*),0) as pass_rate
      FROM assessment_attempts
      WHERE status = 'completed'
      GROUP BY template_id
    `);
    // Per-question difficulty
    const questionDifficulty = await db.execute(`
      SELECT question_id, AVG(is_correct::int) as correct_pct
      FROM assessment_answers
      GROUP BY question_id
    `);
    // Candidate trends (score over time)
    const candidateTrends = await db.execute(`
      SELECT candidate_id, started_at, score
      FROM assessment_attempts
      WHERE status = 'completed'
      ORDER BY candidate_id, started_at
    `);
    // Assessment/job correlation
    const jobCorrelation = await db.execute(`
      SELECT aa.template_id, aa.job_id, aa.score, app.status as application_status
      FROM assessment_attempts aa
      JOIN applications app ON aa.candidate_id = app.candidate_id AND aa.job_id = app.job_id
      WHERE aa.status = 'completed'
    `);
    return {
      avgScores: avgScores.rows || avgScores,
      questionDifficulty: questionDifficulty.rows || questionDifficulty,
      candidateTrends: candidateTrends.rows || candidateTrends,
      jobCorrelation: jobCorrelation.rows || jobCorrelation,
    };
  }

  // Add missing getCandidateAssessments method stub if needed
  async getCandidateAssessments(candidateId: number): Promise<any[]> {
    // Implement this method as needed for your logic
    return [];
  }
}

export const storage = new DatabaseStorage();