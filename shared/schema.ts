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
});

export const applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").references(() => jobs.id).notNull(),
  candidateId: integer("candidate_id").references(() => candidates.id).notNull(),
  status: text("status").notNull().default("applied"), // "applied", "shortlisted", "interview", "hired", "onboarded", "rejected"
  appliedAt: timestamp("applied_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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

// Relations
export const usersRelations = relations(users, ({ one }) => ({
  candidate: one(candidates, {
    fields: [users.id],
    references: [candidates.userId],
  }),
}));

export const candidatesRelations = relations(candidates, ({ one, many }) => ({
  user: one(users, {
    fields: [candidates.userId],
    references: [users.id],
  }),
  education: many(education),
  experience: many(experience),
  applications: many(applications),
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

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertCandidateSchema = createInsertSchema(candidates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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
