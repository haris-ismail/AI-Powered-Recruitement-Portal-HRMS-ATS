import { db } from "./db";
import { users, emailTemplates } from "@shared/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { jobs, candidates, applications, offers, jobCosts } from "@shared/schema";

async function seedAdminUser() {
  try {
    // Check if admin user already exists
    const existingAdmin = await db.select().from(users).where(eq(users.email, "harisismail68@gmail.com"));
    
    if (existingAdmin.length > 0) {
      console.log("Admin user already exists");
      return;
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash("12345678", 10);
    
    await db.insert(users).values({
      email: "harisismail68@gmail.com",
      password: hashedPassword,
      role: "admin"
    });

    console.log("Admin user created successfully");
    console.log("Email: harisismail68@gmail.com");
    console.log("Password: 12345678");
  } catch (error) {
    console.error("Error seeding admin user:", error);
  }
}

async function seedEmailTemplates() {
  try {
    // Check if email templates already exist
    const existingTemplates = await db.select().from(emailTemplates);
    
    if (existingTemplates.length > 0) {
      console.log("Email templates already exist");
      return;
    }

    // Create sample email templates
    await db.insert(emailTemplates).values([
      {
        name: "Application Received",
        subject: "Application Received - {firstName}",
        body: "Dear {firstName} {lastName},\n\nThank you for your application. We have received your application and will review it shortly.\n\nBest regards,\nHR Team"
      },
      {
        name: "Interview Invitation",
        subject: "Interview Invitation - {firstName}",
        body: "Dear {firstName} {lastName},\n\nWe are pleased to invite you for an interview. Please let us know your availability.\n\nBest regards,\nHR Team"
      },
      {
        name: "Application Status Update",
        subject: "Application Status Update - {firstName}",
        body: "Dear {firstName} {lastName},\n\nYour application status has been updated. Please check your dashboard for details.\n\nBest regards,\nHR Team"
      }
    ]);

    console.log("Email templates created successfully");
  } catch (error) {
    console.error("Error seeding email templates:", error);
  }
}

async function seedAnalyticsDemo() {
  // Insert jobs
  const [job1] = await db.insert(jobs).values({
    title: "Software Engineer",
    department: "Engineering",
    experienceLevel: "Mid",
    location: "Remote",
    field: "IT",
    requiredSkills: "JavaScript,React,Node.js",
    description: "Develop and maintain web applications.",
    status: "active"
  }).returning();
  const [job2] = await db.insert(jobs).values({
    title: "Data Analyst",
    department: "Analytics",
    experienceLevel: "Entry",
    location: "Onsite",
    field: "Data",
    requiredSkills: "SQL,Excel,Python",
    description: "Analyze and report on business data.",
    status: "active"
  }).returning();
  const [job3] = await db.insert(jobs).values({
    title: "HR Manager",
    department: "HR",
    experienceLevel: "Senior",
    location: "Onsite",
    field: "HR",
    requiredSkills: "Recruitment,Management",
    description: "Lead the HR team.",
    status: "active"
  }).returning();

  // Insert candidates
  const [cand1] = await db.insert(candidates).values({
    userId: 2,
    cnic: "12345-1234567-1",
    firstName: "Ali",
    lastName: "Khan",
    city: "Lahore",
    province: "Punjab"
  }).returning();
  const [cand2] = await db.insert(candidates).values({
    userId: 3,
    cnic: "98765-7654321-0",
    firstName: "Sara",
    lastName: "Ahmed",
    city: "Karachi",
    province: "Sindh"
  }).returning();

  // Insert applications (one hired)
  const [app1] = await db.insert(applications).values({
    jobId: job1.id,
    candidateId: cand1.id,
    status: "hired",
    appliedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
    hiredAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    source: "referral"
  }).returning();
  const [app2] = await db.insert(applications).values({
    jobId: job2.id,
    candidateId: cand2.id,
    status: "applied",
    appliedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    source: "direct"
  }).returning();

  // Insert offer (accepted)
  await db.insert(offers).values({
    candidateId: cand1.id,
    jobId: job1.id,
    offeredAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    accepted: true,
    acceptedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
  });

  // Insert job cost
  await db.insert(jobCosts).values({
    jobId: job1.id,
    cost: 10000,
    description: "Recruitment agency fee",
    incurredAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
  });

  console.log("Seeded analytics demo data.");
}

async function seed() {
  await seedAdminUser();
  await seedEmailTemplates();
  await seedAnalyticsDemo();
}

seed();