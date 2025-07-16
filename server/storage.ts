import { 
  users, candidates, education, experience, jobTemplates, jobs, applications, emailTemplates, candidateNotes, candidateReviews, skills,
  type User, type InsertUser, type Candidate, type InsertCandidate,
  type Education, type InsertEducation, type Experience, type InsertExperience,
  type JobTemplate, type InsertJobTemplate, type Job, type InsertJob,
  type Application, type InsertApplication, type EmailTemplate, type InsertEmailTemplate,
  type CandidateNote, type InsertCandidateNote,
  type CandidateReview, type InsertCandidateReview,
  type Skill, type InsertSkill
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Candidate management
  getCandidate(userId: number): Promise<Candidate | undefined>;
  getCandidateById(id: number): Promise<Candidate | undefined>;
  createCandidate(candidate: InsertCandidate): Promise<Candidate>;
  updateCandidate(id: number, candidate: Partial<InsertCandidate>): Promise<Candidate>;

  // Education management
  getCandidateEducation(candidateId: number): Promise<Education[]>;
  createEducation(education: InsertEducation): Promise<Education>;
  updateEducation(id: number, education: Partial<InsertEducation>): Promise<Education>;
  deleteEducation(id: number): Promise<void>;

  // Experience management
  getCandidateExperience(candidateId: number): Promise<Experience[]>;
  createExperience(experience: InsertExperience): Promise<Experience>;
  updateExperience(id: number, experience: Partial<InsertExperience>): Promise<Experience>;
  deleteExperience(id: number): Promise<void>;

  // Job templates
  getJobTemplates(): Promise<JobTemplate[]>;
  createJobTemplate(template: InsertJobTemplate): Promise<JobTemplate>;
  deleteJobTemplate(id: number): Promise<void>;

  // Job management
  getJobs(): Promise<Job[]>;
  getJob(id: number): Promise<Job | undefined>;
  createJob(job: InsertJob): Promise<Job>;
  updateJob(id: number, job: Partial<InsertJob>): Promise<Job>;

  // Application management
  getApplications(): Promise<Application[]>;
  getApplicationsByJob(jobId: number): Promise<Application[]>;
  getApplicationsByCandidate(candidateId: number): Promise<Application[]>;
  createApplication(application: InsertApplication): Promise<Application>;
  updateApplication(id: number, application: Partial<InsertApplication>): Promise<Application>;

  // Email template management
  getEmailTemplates(): Promise<EmailTemplate[]>;
  createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate>;

  // Analytics
  getJobStats(): Promise<any>;
  getCandidateWithProfile(candidateId: number): Promise<any>;

  // Candidate Notes management
  getCandidateNotes(candidateId: number): Promise<CandidateNote[]>;
  createCandidateNote(note: InsertCandidateNote): Promise<CandidateNote>;
  updateCandidateNote(id: number, note: Partial<InsertCandidateNote>): Promise<CandidateNote>;
  deleteCandidateNote(id: number): Promise<void>;

  // Candidate Reviews management
  getCandidateReviews(applicationId: number, stage?: string): Promise<CandidateReview[]>;
  createCandidateReview(review: InsertCandidateReview): Promise<CandidateReview>;
  updateCandidateReview(id: number, review: Partial<InsertCandidateReview>): Promise<CandidateReview>;
  deleteCandidateReview(id: number): Promise<void>;

  getCandidateByCnic(cnic: string): Promise<Candidate | undefined>;
  getCandidateSkills(candidateId: number): Promise<Skill[]>;
  createSkill(skill: InsertSkill): Promise<Skill>;
  updateSkill(id: number, skill: Partial<InsertSkill>): Promise<Skill>;
  deleteSkill(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getCandidate(userId: number): Promise<Candidate | undefined> {
    const [candidate] = await db.select().from(candidates).where(eq(candidates.userId, userId));
    return candidate || undefined;
  }

  async getCandidateById(id: number): Promise<Candidate | undefined> {
    const [candidate] = await db.select().from(candidates).where(eq(candidates.id, id));
    return candidate || undefined;
  }

  async createCandidate(candidate: InsertCandidate): Promise<Candidate> {
    const [newCandidate] = await db.insert(candidates).values(candidate).returning();
    return newCandidate;
  }

  async updateCandidate(id: number, candidate: Partial<InsertCandidate>): Promise<Candidate> {
    const [updated] = await db
      .update(candidates)
      .set({ ...candidate, updatedAt: new Date() })
      .where(eq(candidates.id, id))
      .returning();
    return updated;
  }

  async getCandidateEducation(candidateId: number): Promise<Education[]> {
    return await db.select().from(education).where(eq(education.candidateId, candidateId));
  }

  async createEducation(educationData: InsertEducation): Promise<Education> {
    const [newEducation] = await db.insert(education).values(educationData).returning();
    return newEducation;
  }

  async updateEducation(id: number, educationData: Partial<InsertEducation>): Promise<Education> {
    const [updated] = await db
      .update(education)
      .set(educationData)
      .where(eq(education.id, id))
      .returning();
    return updated;
  }

  async deleteEducation(id: number): Promise<void> {
    await db.delete(education).where(eq(education.id, id));
  }

  async getCandidateExperience(candidateId: number): Promise<Experience[]> {
    return await db.select().from(experience).where(eq(experience.candidateId, candidateId));
  }

  async createExperience(experienceData: InsertExperience): Promise<Experience> {
    const [newExperience] = await db.insert(experience).values(experienceData).returning();
    return newExperience;
  }

  async updateExperience(id: number, experienceData: Partial<InsertExperience>): Promise<Experience> {
    const [updated] = await db
      .update(experience)
      .set(experienceData)
      .where(eq(experience.id, id))
      .returning();
    return updated;
  }

  async deleteExperience(id: number): Promise<void> {
    await db.delete(experience).where(eq(experience.id, id));
  }

  async getJobTemplates(): Promise<JobTemplate[]> {
    return await db.select().from(jobTemplates).orderBy(desc(jobTemplates.createdAt));
  }

  async createJobTemplate(template: InsertJobTemplate): Promise<JobTemplate> {
    const [newTemplate] = await db.insert(jobTemplates).values(template).returning();
    return newTemplate;
  }

  async deleteJobTemplate(id: number): Promise<void> {
    await db.delete(jobTemplates).where(eq(jobTemplates.id, id));
  }

  async getJobs(): Promise<Job[]> {
    return await db.select().from(jobs).orderBy(desc(jobs.createdAt));
  }

  async getJob(id: number): Promise<Job | undefined> {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    return job || undefined;
  }

  async createJob(job: InsertJob): Promise<Job> {
    const [newJob] = await db.insert(jobs).values(job).returning();
    return newJob;
  }

  async updateJob(id: number, job: Partial<InsertJob>): Promise<Job> {
    const [updated] = await db
      .update(jobs)
      .set(job)
      .where(eq(jobs.id, id))
      .returning();
    return updated;
  }

  async getApplications(): Promise<Application[]> {
    return await db.select().from(applications).orderBy(desc(applications.appliedAt));
  }

  async getApplicationsByJob(jobId: number): Promise<Application[]> {
    return await db.select().from(applications).where(eq(applications.jobId, jobId));
  }

  async getApplicationsByCandidate(candidateId: number): Promise<Application[]> {
    return await db.select().from(applications).where(eq(applications.candidateId, candidateId));
  }

  async createApplication(application: InsertApplication): Promise<Application> {
    const [newApplication] = await db.insert(applications).values(application).returning();
    return newApplication;
  }

  async updateApplication(id: number, application: Partial<InsertApplication>): Promise<Application> {
    const [updated] = await db
      .update(applications)
      .set({ ...application, updatedAt: new Date() })
      .where(eq(applications.id, id))
      .returning();
    return updated;
  }

  async getEmailTemplates(): Promise<EmailTemplate[]> {
    return await db.select().from(emailTemplates).orderBy(desc(emailTemplates.createdAt));
  }

  async createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate> {
    const [newTemplate] = await db.insert(emailTemplates).values(template).returning();
    return newTemplate;
  }

  async getJobStats(): Promise<any> {
    const totalJobs = await db.select().from(jobs);
    const totalApplications = await db.select().from(applications);

    return {
      activeJobs: totalJobs.filter(j => j.status === 'active').length,
      totalApplications: totalApplications.length,
      interviews: totalApplications.filter(a => a.status === 'interview').length,
      timeToHire: 18 // This would be calculated based on actual data
    };
  }

  async getCandidateWithProfile(candidateId: number): Promise<any> {
    const candidate = await this.getCandidateById(candidateId);
    if (!candidate) return null;

    const candidateEducation = await this.getCandidateEducation(candidateId);
    const candidateExperience = await this.getCandidateExperience(candidateId);

    return {
      ...candidate,
      education: candidateEducation,
      experience: candidateExperience
    };
  }

  async getCandidateNotes(candidateId: number): Promise<CandidateNote[]> {
    return await db.select().from(candidateNotes).where(eq(candidateNotes.candidateId, candidateId));
  }

  async createCandidateNote(note: InsertCandidateNote): Promise<CandidateNote> {
    const [newNote] = await db.insert(candidateNotes).values(note).returning();
    return newNote;
  }

  async updateCandidateNote(id: number, note: Partial<InsertCandidateNote>): Promise<CandidateNote> {
    const [updated] = await db
      .update(candidateNotes)
      .set({ ...note, updatedAt: new Date() })
      .where(eq(candidateNotes.id, id))
      .returning();
    return updated;
  }

  async deleteCandidateNote(id: number): Promise<void> {
    await db.delete(candidateNotes).where(eq(candidateNotes.id, id));
  }

  async getCandidateReviews(applicationId: number, stage?: string): Promise<CandidateReview[]> {
    if (stage) {
      return await db.select().from(candidateReviews)
        .where(and(eq(candidateReviews.applicationId, applicationId), eq(candidateReviews.stage, stage)));
    }
    return await db.select().from(candidateReviews).where(eq(candidateReviews.applicationId, applicationId));
  }

  async createCandidateReview(review: InsertCandidateReview): Promise<CandidateReview> {
    const [newReview] = await db.insert(candidateReviews).values(review).returning();
    return newReview;
  }

  async updateCandidateReview(id: number, review: Partial<InsertCandidateReview>): Promise<CandidateReview> {
    const [updated] = await db
      .update(candidateReviews)
      .set({ ...review, updatedAt: new Date() })
      .where(eq(candidateReviews.id, id))
      .returning();
    return updated;
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
}

export const storage = new DatabaseStorage();