import { db } from "./server/db";
import { sql } from "drizzle-orm";

async function testConnection() {
  try {
    console.log("Testing database connection...");
    
    // Test connection with a simple query
    const result = await db.execute(sql`SELECT 1 as test`);
    console.log("✅ Database connection successful!");
    console.log("Test query result:", result.rows);
    
    // Count users as an example
    const users = await db.execute(sql`SELECT COUNT(*) as user_count FROM users`);
    console.log("👥 Total users:", users.rows[0].user_count);
    
  } catch (error) {
    console.error("❌ Database connection failed:", error);
  } finally {
    process.exit(0);
  }
}

testConnection();
