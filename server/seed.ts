import { db } from "./db";
import { users, emailTemplates } from "@shared/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

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

async function seed() {
  await seedAdminUser();
  await seedEmailTemplates();
}

seed();