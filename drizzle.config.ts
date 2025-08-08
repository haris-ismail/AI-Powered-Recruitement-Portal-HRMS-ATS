import { defineConfig } from "drizzle-kit";

// Use the correct database URL with the correct password
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:2162@localhost:5432/nastp_db";

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: DATABASE_URL,
  },
});
