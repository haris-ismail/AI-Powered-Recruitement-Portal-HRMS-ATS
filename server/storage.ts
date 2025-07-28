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
  assessmentAnswers, searchQueries, type SearchQuery, type InsertSearchQuery, type SearchFilters, type SearchResult,
  offers, jobCosts, type InsertOffer, type Offer, type InsertJobCost, type JobCost
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, like, ilike, or, sql, count } from "drizzle-orm";

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
  updateJobTemplate(id: number, template: Partial<InsertJobTemplate>): Promise<JobTemplate>;
  deleteJobTemplate(id: number): Promise<void>;
  getJobs(): Promise<Job[]>;
  getJob(id: number): Promise<Job | undefined>;
  getJobById(jobId: number): Promise<Job | null>;
  createJob(job: InsertJob): Promise<Job>;
  updateJob(id: number, job: Partial<InsertJob>): Promise<Job>;
  getApplications(): Promise<Application[]>;
  getApplicationsByJob(jobId: number): Promise<Application[]>;
  getApplicationsByCandidate(candidateId: number): Promise<Application[]>;
  createApplication(application: InsertApplication): Promise<Application>;
  updateApplication(id: number, application: Partial<InsertApplication>): Promise<Application>;
  getApplicationById(applicationId: number): Promise<Application | null>;
  deleteApplication(applicationId: number): Promise<void>;
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
  startAssessment(templateId: number, candidateId: number, jobId?: number | undefined): Promise<any>;
  submitAssessment(attemptId: number, data: any): Promise<any>;
  getAssessmentResults(attemptId: number): Promise<any>;
  getAllAssessmentResults(): Promise<any[]>;
  reviewShortAnswer(attemptId: number, questionId: number, isCorrect: boolean, pointsEarned: number): Promise<any>;
  getAssessmentAnalytics(): Promise<any>;
  getCandidateAssessments(candidateId: number): Promise<any[]>;
  searchResumes(query: string, filters: SearchFilters, page: number, limit: number): Promise<SearchResult>;
  getSearchSuggestions(query: string): Promise<string[]>;
  saveSearchQuery(query: string, filters: SearchFilters, resultsCount: number, userId: number): Promise<void>;
  getSearchHistory(userId: number): Promise<SearchQuery[]>;
  getApplication(id: number): Promise<Application | undefined>;
  // Offers
  getOffersByJob(jobId: number): Promise<Offer[]>;
  getOffersByCandidate(candidateId: number): Promise<Offer[]>;
  createOffer(offer: InsertOffer): Promise<Offer>;
  updateOffer(id: number, offer: Partial<InsertOffer>): Promise<Offer>;
  // Job Costs
  getJobCostsByJob(jobId: number): Promise<JobCost[]>;
  createJobCost(cost: InsertJobCost): Promise<JobCost>;
  updateJobCost(id: number, cost: Partial<InsertJobCost>): Promise<JobCost>;
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

  async updateJobTemplate(id: number, template: Partial<InsertJobTemplate>): Promise<JobTemplate> {
    const [row] = await db.update(jobTemplates).set(template).where(eq(jobTemplates.id, id)).returning();
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

  async getJobById(jobId: number): Promise<Job | null> {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId));
    return job || null;
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

  async getApplicationById(applicationId: number): Promise<Application | null> {
    const [application] = await db.select()
      .from(applications)
      .where(eq(applications.id, applicationId));
    return application || null;
  }

  async deleteApplication(applicationId: number): Promise<void> {
    await db.delete(applications)
      .where(eq(applications.id, applicationId));
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

  async getAssessmentTemplate(templateId: number): Promise<any> {
    try {
      console.log(`Fetching assessment template with ID: ${templateId}`);
      const [template] = await db
        .select()
        .from(assessmentTemplates)
        .where(eq(assessmentTemplates.id, templateId));
      
      if (!template) {
        console.log(`Template not found for ID: ${templateId}`);
        return null;
      }
      
      console.log('Template found, fetching questions...');
      const questions = await this.getAssessmentQuestions(templateId);
      
      // Format questions to ensure they have the expected structure
      const formattedQuestions = questions.map(q => ({
        ...q,
        options: Array.isArray(q.options) ? q.options : (q.options ? [q.options] : []),
        correctAnswers: Array.isArray(q.correctAnswers) ? q.correctAnswers : (q.correctAnswers ? [q.correctAnswers] : [])
      }));
      
      return {
        ...template,
        questions: formattedQuestions
      };
    } catch (error) {
      console.error('Error in getAssessmentTemplate:', error);
      throw error;
    }
  }

  async getAssessmentQuestions(templateId: number): Promise<any[]> {
    try {
      console.log(`Fetching questions for template ID: ${templateId}`);
      const questions = await db
        .select()
        .from(assessmentQuestions)
        .where(eq(assessmentQuestions.templateId, templateId))
        .orderBy(assessmentQuestions.orderIndex);
      
      console.log(`Found ${questions.length} questions for template ${templateId}`);
      
      // Ensure questions have properly formatted options and correctAnswers
      return questions.map(question => ({
        ...question,
        options: question.options ? (Array.isArray(question.options) ? question.options : [question.options]) : [],
        correctAnswers: question.correctAnswers ? (Array.isArray(question.correctAnswers) ? question.correctAnswers : [question.correctAnswers]) : []
      }));
    } catch (error) {
      console.error('Error in getAssessmentQuestions:', error);
      throw error;
    }
  }

  async findAssessmentAttempt(candidateId: number, templateId: number, jobId: number): Promise<any> {
    try {
      const conditions = [
        eq(assessmentAttempts.candidateId, candidateId),
        eq(assessmentAttempts.templateId, templateId),
        eq(assessmentAttempts.jobId, jobId),
        eq(assessmentAttempts.status, 'in_progress')
      ];

      const [attempt] = await db
        .select()
        .from(assessmentAttempts)
        .where(and(...conditions))
        .orderBy(desc(assessmentAttempts.createdAt))
        .limit(1);
      
      return attempt || null;
    } catch (error) {
      console.error('Error in findAssessmentAttempt:', error);
      throw error;
    }
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
    const jobAssessmentsList = await db
      .select({
        job_assessments: {
          id: jobAssessments.id,
          jobId: jobAssessments.jobId,
          templateId: jobAssessments.templateId,
          isRequired: jobAssessments.isRequired,
          createdAt: jobAssessments.createdAt
        },
        jobs: {
          id: jobs.id,
          title: jobs.title,
          department: jobs.department,
          location: jobs.location,
          status: jobs.status,
          description: jobs.description,
          experienceLevel: jobs.experienceLevel,
          createdAt: jobs.createdAt
        }
      })
      .from(jobAssessments)
      .leftJoin(jobs, eq(jobAssessments.jobId, jobs.id))
      .where(eq(jobAssessments.jobId, jobId));
    
    // Transform the result to match the expected format
    return jobAssessmentsList.map(item => ({
      ...item.job_assessments,
      job: item.jobs
    }));
  }
  


  async createJobAssessment(jobId: number, data: any): Promise<any> {
    const [row] = await db.insert(jobAssessments).values({ ...data, jobId }).returning();
    return row;
  }

  async deleteJobAssessment(id: number): Promise<void> {
    await db.delete(jobAssessments).where(eq(jobAssessments.id, id));
  }

  async getPendingAssessments(candidateId: number): Promise<any[]> {
    try {
      // Get all applications for the candidate
      const applications = await this.getApplicationsByCandidate(candidateId);
      if (applications.length === 0) return [];
      
      // Get all job assessments for these applications
      const jobIds = [...new Set(applications.map(app => app.jobId))];
      const allAssessments = [];
      
      for (const jobId of jobIds) {
        const jobAssessments = await this.getJobAssessments(jobId);
        allAssessments.push(...jobAssessments);
      }
      
      // Get assessment templates and filter out any without templates
      const assessmentsWithTemplates = [];
      
      for (const assessment of allAssessments) {
        // Check if there's already an attempt for this assessment
        const existingAttempt = await this.findAssessmentAttempt(
          candidateId,
          assessment.templateId,
          assessment.jobId
        );
        
        // Only include assessments that don't have a completed attempt
        if (!existingAttempt || existingAttempt.status === 'in_progress') {
          const template = await this.getAssessmentTemplate(assessment.templateId);
          if (template) {
            assessmentsWithTemplates.push({
              ...assessment,
              template,
              jobId: assessment.jobId,
              status: existingAttempt?.status || 'not_started',
              attemptId: existingAttempt?.id
            });
          }
        }
      }
      
      return assessmentsWithTemplates;
    } catch (error) {
      console.error('Error in getPendingAssessments:', error);
      throw error;
    }
  }

  async startAssessment(templateId: number, candidateId: number, jobId?: number | undefined): Promise<any> {
    // Prevent multiple attempts
    const existing = await db.select().from(assessmentAttempts)
      .where(and(
        eq(assessmentAttempts.candidateId, candidateId),
        eq(assessmentAttempts.templateId, templateId),
        jobId !== undefined ? eq(assessmentAttempts.jobId, jobId) : isNull(assessmentAttempts.jobId),
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
export class DatabaseStorage {
  async searchResumes(query: string, filters: SearchFilters, page: number, limit: number): Promise<SearchResult> {
    let whereConditions = [];
    let joinExperience = false;
    let joinEducation = false;
    let joinSkills = false;

    if (query) {
      whereConditions.push(
        sql`to_tsvector('english', ${candidates.resumeText}) @@ plainto_tsquery('english', ${query})`
      );
    }

    if (filters.firstName) whereConditions.push(ilike(candidates.firstName, `%${filters.firstName}%`));
    if (filters.lastName) whereConditions.push(ilike(candidates.lastName, `%${filters.lastName}%`));
    if (filters.city) whereConditions.push(ilike(candidates.city, `%${filters.city}%`));
    if (filters.province) whereConditions.push(ilike(candidates.province, `%${filters.province}%`));
    if (filters.cnic) whereConditions.push(ilike(candidates.cnic, `%${filters.cnic}%`));
    if (filters.motivationLetter) whereConditions.push(ilike(candidates.motivationLetter, `%${filters.motivationLetter}%`));

    if (filters.skills?.length) joinSkills = true;
    if (filters.experience?.length) joinExperience = true;
    if (filters.education?.length) joinEducation = true;

    let queryBuilder = db.select().from(candidates);

    if (joinSkills) {
      queryBuilder = queryBuilder.leftJoin(skills, eq(skills.candidateId, candidates.id));
      whereConditions.push(
        or(...filters.skills.map(skill => ilike(skills.name, `%${skill}%`)))
      );
    }

    if (joinExperience) {
      queryBuilder = queryBuilder.leftJoin(experience, eq(experience.candidateId, candidates.id));
      whereConditions.push(
        or(...filters.experience.map(exp =>
          or(ilike(experience.company, `%${exp}%`), ilike(experience.role, `%${exp}%`))
        ))
      );
    }

    if (joinEducation) {
      queryBuilder = queryBuilder.leftJoin(education, eq(education.candidateId, candidates.id));
      whereConditions.push(
        or(...filters.education.map(edu =>
          or(ilike(education.degree, `%${edu}%`), ilike(education.institution, `%${edu}%`))
        ))
      );
    }

    if (whereConditions.length > 0) {
      queryBuilder = queryBuilder.where(and(...whereConditions));
    }

    // Count total
    let countQuery = db.select({ count: count() }).from(candidates);
    if (joinSkills) countQuery = countQuery.leftJoin(skills, eq(skills.candidateId, candidates.id));
    if (joinExperience) countQuery = countQuery.leftJoin(experience, eq(experience.candidateId, candidates.id));
    if (joinEducation) countQuery = countQuery.leftJoin(education, eq(education.candidateId, candidates.id));
    if (whereConditions.length > 0) countQuery = countQuery.where(and(...whereConditions));
    const totalResult = await countQuery;
    const total = totalResult[0]?.count || 0;

    const results = await queryBuilder
      .limit(limit)
      .offset((page - 1) * limit)
      .orderBy(desc(candidates.createdAt));

    return {
      candidates: results,
      total,
      page,
      limit,
      filters,
      suggestions: []
    };
  }

  async getSearchSuggestions(query: string): Promise<string[]> {
    const suggestions = await db
      .select({ query: searchQueries.query })
      .from(searchQueries)
      .where(ilike(searchQueries.query, `%${query}%`))
      .limit(5);
    return suggestions.map(s => s.query);
  }

  async saveSearchQuery(query: string, filters: SearchFilters, resultsCount: number, userId: number): Promise<void> {
    await db.insert(searchQueries).values({
      query,
      filters: JSON.stringify(filters),
      resultsCount,
      createdBy: userId
    });
  }

  async getSearchHistory(userId: number): Promise<SearchQuery[]> {
    return await db
      .select()
      .from(searchQueries)
      .where(eq(searchQueries.createdBy, userId))
      .orderBy(desc(searchQueries.createdAt))
      .limit(10);
  }

  async getApplication(id: number): Promise<Application | undefined> {
    return await db
      .select()
      .from(applications)
      .where(eq(applications.id, id))
      .then(rows => rows[0]);
  }

  // Offers
  async getOffersByJob(jobId: number): Promise<Offer[]> {
    return await db.select().from(offers).where(eq(offers.jobId, jobId));
  }

  async getOffersByCandidate(candidateId: number): Promise<Offer[]> {
    return await db.select().from(offers).where(eq(offers.candidateId, candidateId));
  }

  async createOffer(offer: InsertOffer): Promise<Offer> {
    const [row] = await db.insert(offers).values(offer).returning();
    return row;
  }

  async updateOffer(id: number, offer: Partial<InsertOffer>): Promise<Offer> {
    const [row] = await db.update(offers).set(offer).where(eq(offers.id, id)).returning();
    return row;
  }

  // Job Costs
  async getJobCostsByJob(jobId: number): Promise<JobCost[]> {
    return await db.select().from(jobCosts).where(eq(jobCosts.jobId, jobId));
  }

  async createJobCost(cost: InsertJobCost): Promise<JobCost> {
    const [row] = await db.insert(jobCosts).values(cost).returning();
    return row;
  }

  async updateJobCost(id: number, cost: Partial<InsertJobCost>): Promise<JobCost> {
    const [row] = await db.update(jobCosts).set(cost).where(eq(jobCosts.id, id)).returning();
    return row;
  }

  // Assessments
  async getAssessmentsByJob(jobId: number): Promise<any[]> {
    const job = await this.getJobById(jobId);
    const assessments = await db
      .select()
      .from(jobAssessments)
      .leftJoin(assessmentTemplates, eq(jobAssessments.templateId, assessmentTemplates.id))
      .where(eq(jobAssessments.jobId, jobId));

    if (job?.assessmentTemplateId && assessments.length === 0) {
      const template = await db
        .select()
        .from(assessmentTemplates)
        .where(eq(assessmentTemplates.id, job.assessmentTemplateId))
        .then(rows => rows[0]);

      if (template) {
        return [{ templateId: job.assessmentTemplateId, ...template, isRequired: true }];
      }
    }

    return assessments.map(assessment => ({
      ...assessment,
      isRequired: assessment.isRequired ?? true
    }));
  }

  async createAssessmentAttempt(data: {
    templateId: number;
    candidateId: number;
    jobId: number | null;
    startedAt: Date;
  }): Promise<any> {
    const [row] = await db.insert(assessmentAttempts).values(data).returning();
    return row;
  }

  async getApplicationByCandidateAndJob(candidateId: number, jobId: number): Promise<Application | null> {
    const [application] = await db
      .select()
      .from(applications)
      .where(and(eq(applications.candidateId, candidateId), eq(applications.jobId, jobId)));
    return application || null;
  }

  // Placeholder: Add getJobById if used by getAssessmentsByJob
  async getJobById(id: number): Promise<Job | null> {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    return job || null;
  }
}

export const storage = new DatabaseStorage();
