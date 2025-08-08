import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

// Test database connection with correct password and database name
async function testConnection() {
  const pool = new Pool({
    connectionString: 'postgresql://postgres:2162@localhost:5432/nastp_db'
  });

  try {
    const client = await pool.connect();
    console.log('✅ Database connection successful!');
    
    // Test if users table exists
    const result = await client.query('SELECT COUNT(*) FROM users');
    console.log(`✅ Users table exists with ${result.rows[0].count} records`);
    
    // Check if admin user already exists
    const adminCheck = await client.query(
      "SELECT * FROM users WHERE email = 'harisismail68@gmail.com'"
    );
    
    if (adminCheck.rows.length > 0) {
      console.log('✅ Admin user already exists');
      console.log('Email: harisismail68@gmail.com');
      console.log('Password: 12345678');
    } else {
      // Create admin user
      const hashedPassword = await bcrypt.hash('12345678', 10);
      await client.query(
        'INSERT INTO users (email, password, role) VALUES ($1, $2, $3)',
        ['harisismail68@gmail.com', hashedPassword, 'admin']
      );
      console.log('✅ Admin user created successfully!');
      console.log('Email: harisismail68@gmail.com');
      console.log('Password: 12345678');
    }
    
    client.release();
    await pool.end();
    
    console.log('\n🎉 Success! Update your .env file with:');
    console.log('DATABASE_URL=postgresql://postgres:2162@localhost:5432/nastp_db');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  }
}

testConnection(); 