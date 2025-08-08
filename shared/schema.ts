import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("candidate"), // "admin" or "candidate"
  createdAt: timestamp("created_at").defaultNow(),
});

export const candidates = pgTable("candidates", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  cnic: text("cnic").notNull().unique(), // Added CNIC field
  profilePicture: text("profile_picture"), // Added profile picture field
  firstName: text("first_name"),
  lastName: text("last_name"),
  dateOfBirth: text("date_of_birth"),
  apartment: text("apartment"),
  street: text("street"),
  area: text("area"),
  city: text("city"),
  province: text("province"),
  postalCode: text("postal_code"),
  resumeUrl: text("resume_url"),
  motivationLetter: text("motivation_letter"),
  resumeText: text("resume_text"), // Extracted resume text
<<<<<<< Updated upstream
  linkedinUrl: text("linkedin_url"), // Added LinkedIn URL
  githubUrl: text("github_url"), // Added GitHub URL
=======
<<<<<<< Updated upstream
=======
  linkedin: text("linkedin"),
  github: text("github"),
>>>>>>> Stashed changes
>>>>>>> Stashed changes
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const education = pgTable("education", {
  id: serial("id").primaryKey(),
  candidateId: integer("candidate_id").references(() => candidates.id).notNull(),
  degree: text("degree").notNull(),
  institution: text("institution").notNull(),
  fromDate: text("from_date").notNull(),
  toDate: text("to_date").notNull(),
  totalMarks: text("total_marks").notNull(),
  obtainedMarks: text("obtained_marks").notNull(),
});

export const experience = pgTable("experience", {
  id: serial("id").primaryKey(),
  candidateId: integer("candidate_id").references(() => candidates.id).notNull(),
  company: text("company").notNull(),
  role: text("role").notNull(),
  fromDate: text("from_date").notNull(),
  toDate: text("to_date").notNull(),
  skills: text("skills").notNull(),
  description: json("description"), // JSON array for bullet points
});

export const jobTemplates = pgTable("job_templates", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  department: text("department").notNull(),
  experienceLevel: text("experience_level").notNull(),
  location: text("location").notNull(),
  salaryMin: integer("salary_min"),
  field: text("field").notNull(),
  requiredSkills: text("required_skills").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  department: text("department").notNull(),
  experienceLevel: text("experience_level").notNull(),
  location: text("location").notNull(),
  salaryMin: integer("salary_min"),
  field: text("field").notNull(),
  requiredSkills: text("required_skills").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("active"), // "active", "closed"
  createdAt: timestamp("created_at").defaultNow(),
  assessmentTemplateId: integer("assessment_template_id").references(() => assessmentTemplates.id),
});

export const applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").references(() => jobs.id).notNull(),
  candidateId: integer("candidate_id").references(() => candidates.id).notNull(),
  status: text("status").notNull().default("applied"), // "applied", "shortlisted", "interview", "hired", "onboarded", "rejected"
  appliedAt: timestamp("applied_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  ai_score: integer("ai_score"), // AI score (0-100)
  ai_score_breakdown: json("ai_score_breakdown"), // JSON breakdown of scores
  red_flags: text("red_flags"), // Red flag text
  hiredAt: timestamp("hired_at"), // New: when candidate was hired
  source: text("source"), // New: source of application
});

export const emailTemplates = pgTable("email_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const candidateNotes = pgTable("candidate_notes", {
  id: serial("id").primaryKey(),
  candidateId: integer("candidate_id").references(() => candidates.id).notNull(),
  adminId: integer("admin_id").references(() => users.id).notNull(),
  note: text("note").notNull(),
  score: integer("score"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const candidateReviews = pgTable("candidate_reviews", {
  id: serial("id").primaryKey(),
  candidateId: integer("candidate_id").references(() => candidates.id).notNull(),
  applicationId: integer("application_id").references(() => applications.id).notNull(),
  reviewerId: integer("reviewer_id").references(() => users.id).notNull(),
  stage: text("stage").notNull(),
  rating: integer("rating").notNull(),
  feedback: text("feedback"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Skills table
export const skills = pgTable("skills", {
  id: serial("id").primaryKey(),
  candidateId: integer("candidate_id").references(() => candidates.id).notNull(),
  name: text("name").notNull(),
  expertiseLevel: integer("expertise_level").notNull(), // 1 (beginner) to 5 (expert)
});

// Projects table
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  candidateId: integer("candidate_id").references(() => candidates.id).notNull(),
  title: text("title").notNull(),
  description: json("description"), // JSON array for bullet points
  techStack: text("tech_stack"),
  githubUrl: text("github_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Assessment-related tables
export const assessmentCategories = pgTable("assessment_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const assessmentTemplates = pgTable("assessment_templates", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  categoryId: integer("category_id").references(() => assessmentCategories.id).notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  passingScore: integer("passing_score").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const assessmentQuestions = pgTable("assessment_questions", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").references(() => assessmentTemplates.id).notNull(),
  questionText: text("question_text").notNull(),
  questionType: text("question_type").notNull(), // mcq_single, mcq_multiple, true_false, short_answer
  options: json("options"), // JSON array of options
  correctAnswers: json("correct_answers"), // JSON array of correct answers
  points: integer("points").notNull(),
  orderIndex: integer("order_index").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const jobAssessments = pgTable("job_assessments", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").references(() => jobs.id).notNull(),
  templateId: integer("template_id").references(() => assessmentTemplates.id).notNull(),
  isRequired: boolean("is_required").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const assessmentAttempts = pgTable("assessment_attempts", {
  id: serial("id").primaryKey(),
  candidateId: integer("candidate_id").references(() => candidates.id).notNull(),
  templateId: integer("template_id").references(() => assessmentTemplates.id).notNull(),
  jobId: integer("job_id").references(() => jobs.id),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  score: integer("score"),
  maxScore: integer("max_score"),
  passed: boolean("passed"),
  status: text("status").notNull().default("in_progress"), // in_progress, completed, expired
  createdAt: timestamp("created_at").defaultNow(),
});

export const assessmentAnswers = pgTable("assessment_answers", {
  id: serial("id").primaryKey(),
  attemptId: integer("attempt_id").references(() => assessmentAttempts.id).notNull(),
  questionId: integer("question_id").references(() => assessmentQuestions.id).notNull(),
  answerText: json("answer_text"), // JSON to support multiple types of answers
  isCorrect: boolean("is_correct"),
  pointsEarned: integer("points_earned"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Search-related tables
export const searchQueries = pgTable("search_queries", {
  id: serial("id").primaryKey(),
  query: text("query").notNull(),
  filters: json("filters"), // JSON object for search filters
  resultsCount: integer("results_count"),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const offers = pgTable("offers", {
  id: serial("id").primaryKey(),
  candidateId: integer("candidate_id").references(() => candidates.id).notNull(),
  jobId: integer("job_id").references(() => jobs.id).notNull(),
  offeredAt: timestamp("offered_at").defaultNow(),
  accepted: boolean("accepted").default(false),
  acceptedAt: timestamp("accepted_at"), // Optional: when offer was accepted
});

export const jobCosts = pgTable("job_costs", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").references(() => jobs.id).notNull(),
  cost: integer("cost").notNull(), // Use integer for simplicity; change to float if needed
  description: text("description"), // Optional: description of cost
  incurredAt: timestamp("incurred_at").defaultNow(),
});

export const companyInfo = pgTable("company_info", {
  id: serial("id").primaryKey(),
  sectionName: text("section_name").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  candidate: one(candidates, {
    fields: [users.id],
    references: [candidates.userId],
  }),
  searchQueries: many(searchQueries),
}));

export const candidatesRelations = relations(candidates, ({ one, many }) => ({
  user: one(users, {
    fields: [candidates.userId],
    references: [users.id],
  }),
  education: many(education),
  experience: many(experience),
  applications: many(applications),
  skills: many(skills), // Add skills relation
  projects: many(projects), // Add projects relation
}));

export const educationRelations = relations(education, ({ one }) => ({
  candidate: one(candidates, {
    fields: [education.candidateId],
    references: [candidates.id],
  }),
}));

export const experienceRelations = relations(experience, ({ one }) => ({
  candidate: one(candidates, {
    fields: [experience.candidateId],
    references: [candidates.id],
  }),
}));

export const jobsRelations = relations(jobs, ({ many }) => ({
  applications: many(applications),
}));

export const applicationsRelations = relations(applications, ({ one }) => ({
  job: one(jobs, {
    fields: [applications.jobId],
    references: [jobs.id],
  }),
  candidate: one(candidates, {
    fields: [applications.candidateId],
    references: [candidates.id],
  }),
}));

export const candidateNotesRelations = relations(candidateNotes, ({ one }) => ({
  candidate: one(candidates, {
    fields: [candidateNotes.candidateId],
    references: [candidates.id],
  }),
  admin: one(users, {
    fields: [candidateNotes.adminId],
    references: [users.id],
  }),
}));

export const candidateReviewsRelations = relations(candidateReviews, ({ one }) => ({
  candidate: one(candidates, {
    fields: [candidateReviews.candidateId],
    references: [candidates.id],
  }),
  application: one(applications, {
    fields: [candidateReviews.applicationId],
    references: [applications.id],
  }),
  reviewer: one(users, {
    fields: [candidateReviews.reviewerId],
    references: [users.id],
  }),
}));

export const skillsRelations = relations(skills, ({ one }) => ({
  candidate: one(candidates, {
    fields: [skills.candidateId],
    references: [candidates.id],
  }),
}));

export const projectsRelations = relations(projects, ({ one }) => ({
  candidate: one(candidates, {
    fields: [projects.candidateId],
    references: [candidates.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

<<<<<<< Updated upstream
export const insertCandidateSchema = createInsertSchema(candidates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
=======
export const insertCandidateSchema = z.object({
  userId: z.number().optional(),
>>>>>>> Stashed changes
  cnic: z.string().length(14, 'CNIC must be exactly 14 digits').regex(/^\d{14}$/, 'CNIC must be 14 digits'),
  profilePicture: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  dateOfBirth: z.string().optional(),
  apartment: z.string().optional(),
  street: z.string().optional(),
  area: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  postalCode: z.string().optional(),
  resumeUrl: z.string().optional(),
  motivationLetter: z.string().optional(),
  resumeText: z.string().optional(),
  linkedin: z.string().optional(),
  github: z.string().optional(),
  projects: z.array(z.object({
    id: z.number().optional(),
    title: z.string(),
    description: z.array(z.string()),
    techStack: z.string().optional(),
    githubUrl: z.string().optional(),
  })).optional(),
});

export const insertEducationSchema = createInsertSchema(education).omit({
  id: true,
});

export const insertExperienceSchema = createInsertSchema(experience).omit({
  id: true,
});

export const insertJobTemplateSchema = createInsertSchema(jobTemplates).omit({
  id: true,
  createdAt: true,
});

export const insertJobSchema = createInsertSchema(jobs).omit({
  id: true,
  createdAt: true,
});

export const insertApplicationSchema = createInsertSchema(applications).omit({
  id: true,
  appliedAt: true,
  updatedAt: true,
});

export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).omit({
  id: true,
  createdAt: true,
});

export const insertCandidateNoteSchema = createInsertSchema(candidateNotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCandidateReviewSchema = createInsertSchema(candidateReviews).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSkillSchema = createInsertSchema(skills).omit({
  id: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Search-related schemas and types
export const insertSearchQuerySchema = createInsertSchema(searchQueries).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Candidate = typeof candidates.$inferSelect;
export type InsertCandidate = z.infer<typeof insertCandidateSchema>;
export type Education = typeof education.$inferSelect;
export type InsertEducation = z.infer<typeof insertEducationSchema>;
export type Experience = typeof experience.$inferSelect;
export type InsertExperience = z.infer<typeof insertExperienceSchema>;
export type JobTemplate = typeof jobTemplates.$inferSelect;
export type InsertJobTemplate = z.infer<typeof insertJobTemplateSchema>;
export type Job = typeof jobs.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Application = typeof applications.$inferSelect;
export type InsertApplication = z.infer<typeof insertApplicationSchema>;
export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;
export type CandidateNote = typeof candidateNotes.$inferSelect;
export type InsertCandidateNote = z.infer<typeof insertCandidateNoteSchema>;
export type CandidateReview = typeof candidateReviews.$inferSelect;
export type InsertCandidateReview = z.infer<typeof insertCandidateReviewSchema>;
export type Skill = typeof skills.$inferSelect;
export type InsertSkill = z.infer<typeof insertSkillSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type SearchQuery = typeof searchQueries.$inferSelect;
export type InsertSearchQuery = z.infer<typeof insertSearchQuerySchema>;
export type Offer = typeof offers.$inferSelect;
export type InsertOffer = z.infer<ReturnType<typeof createInsertSchema<typeof offers>>>;
export type JobCost = typeof jobCosts.$inferSelect;
export type InsertJobCost = z.infer<ReturnType<typeof createInsertSchema<typeof jobCosts>>>;
export type CompanyInfo = typeof companyInfo.$inferSelect;
export type InsertCompanyInfo = z.infer<ReturnType<typeof createInsertSchema<typeof companyInfo>>>;

// Search-related types
export interface SearchFilters {
  skills?: string[];
  experience?: string[];
  education?: string[];
  location?: string[];
  status?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  // Added for advanced candidate filtering
  firstName?: string;
  lastName?: string;
  city?: string;
  province?: string;
  cnic?: string;
  motivationLetter?: string;
}

export interface SearchResult {
  candidates: Candidate[];
  total: number;
  page: number;
  limit: number;
  filters: SearchFilters;
  suggestions: string[];
}

export const skillRequestSchema = z.object({
  name: z.string().min(1),
  expertiseLevel: z.number().min(1).max(5)
});