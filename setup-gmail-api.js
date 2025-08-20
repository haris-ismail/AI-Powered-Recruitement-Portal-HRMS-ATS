#!/usr/bin/env node

import { google } from 'googleapis';
import readline from 'readline';
import fs from 'fs';
import path from 'path';

console.log('🚀 NASTP HRMS - Gmail API Setup Wizard');
console.log('==========================================');
console.log('');

// Your provided credentials
const CLIENT_ID = '724529091733-5cn0k68nde5prn1mno0f84b0nvr8ep8r.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REDIRECT_URI = 'http://localhost:5000/api/auth/google/callback';

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

const SCOPES = ['https://www.googleapis.com/auth/gmail.send'];

async function setupGmailAPI() {
  try {
    console.log('📋 Step 1: Verifying your credentials...');
    console.log(`✅ Client ID: ${CLIENT_ID}`);
    console.log(`✅ Client Secret: ${CLIENT_SECRET}`);
    console.log(`✅ Redirect URI: ${REDIRECT_URI}`);
    console.log('');

    // Check if .env file exists
    const envPath = path.join(process.cwd(), '.env');
    const envExists = fs.existsSync(envPath);
    
    if (envExists) {
      console.log('📁 .env file found. Updating with new credentials...');
    } else {
      console.log('📁 Creating new .env file...');
    }

    // Generate authorization URL
    console.log('🔐 Step 2: Generating authorization URL...');
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent', // Force consent to get refresh token
    });

    console.log('');
    console.log('📱 Step 3: Authorize this application');
    console.log('Visit this URL in your browser:');
    console.log('');
    console.log(`🔗 ${url}`);
    console.log('');
    console.log('📋 After authorization, you will receive an authorization code.');
    console.log('Copy that code and paste it below.');
    console.log('');

    const rl = readline.createInterface({ 
      input: process.stdin, 
      output: process.stdout 
    });

    rl.question('Enter the authorization code here: ', async (code) => {
      try {
        console.log('');
        console.log('🔄 Step 4: Exchanging code for tokens...');
        
        const { tokens } = await oauth2Client.getToken(code);
        
        if (!tokens.refresh_token) {
          throw new Error('No refresh token received. Please ensure you\'re using a new authorization flow.');
        }

        console.log('✅ Tokens received successfully!');
        console.log('');

        // Create/update .env file
        const envContent = `# Database Configuration
DATABASE_URL=postgresql://postgres:12345678@localhost:5433/nastp_db

# JWT Secret (generate a strong random string)
JWT_SECRET=your-super-secret-jwt-key-here-make-it-very-long-and-random

# Google OAuth2 Credentials
GOOGLE_CLIENT_ID=${CLIENT_ID}
GOOGLE_CLIENT_SECRET=${CLIENT_SECRET}
GOOGLE_REDIRECT_URI=${REDIRECT_URI}
GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}

# Server Configuration
PORT=5000
NODE_ENV=development

# Redis Configuration (optional)
REDIS_URL=redis://localhost:6379

# Note: Keep your refresh token secure and never commit it to version control!
`;

        fs.writeFileSync(envPath, envContent);
        console.log('📁 .env file created/updated successfully!');
        console.log('');

        console.log('🎉 Setup Complete!');
        console.log('==================');
        console.log('✅ Gmail API credentials configured');
        console.log('✅ Refresh token generated and saved');
        console.log('✅ Environment file created');
        console.log('');
        console.log('🔒 Security Notes:');
        console.log('   - Never commit .env file to version control');
        console.log('   - Keep your refresh token secure');
        console.log('   - Rotate tokens periodically');
        console.log('');
        console.log('🧪 Next Steps:');
        console.log('   1. Start your server: npm run dev');
        console.log('   2. Test email functionality in admin panel');
        console.log('   3. Create email templates');
        console.log('   4. Send test emails to candidates');
        console.log('');
        console.log('📧 Your Gmail API is now ready to send automated emails!');
        
        rl.close();
      } catch (error) {
        console.error('');
        console.error('❌ Error during token exchange:', error.message);
        console.error('');
        console.error('🔧 Troubleshooting:');
        console.error('   - Make sure you\'re using a fresh authorization code');
        console.error('   - Check that your Google Cloud Console is properly configured');
        console.error('   - Ensure Gmail API is enabled in your project');
        console.error('   - Try the authorization process again');
        
        rl.close();
      }
    });

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.error('');
    console.error('🔧 Please check:');
    console.error('   - Your internet connection');
    console.error('   - Google Cloud Console configuration');
    console.error('   - API enablement status');
  }
}

// Run the setup
setupGmailAPI();
