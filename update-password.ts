import bcrypt from 'bcryptjs';
import { pool } from './server/db';

async function updatePassword() {
  try {
    const email = 'harisismail68@gmail.com';
    const newPassword = '123456';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    const result = await pool.query(
      'UPDATE users SET password = $1 WHERE email = $2 RETURNING id, email',
      [hashedPassword, email]
    );
    
    if (result.rowCount === 0) {
      console.log('No user found with that email');
    } else {
      console.log('Password updated successfully for:', result.rows[0]);
    }
  } catch (error) {
    console.error('Error updating password:', error);
  } finally {
    process.exit(0);
  }
}

updatePassword();
