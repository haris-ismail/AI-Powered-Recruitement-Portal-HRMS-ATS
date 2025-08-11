import { google } from 'googleapis';
import readline from 'readline';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '698347749849-ctith6ro5un87v2m5u8q3a5n4guandm9.apps.googleusercontent.com';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '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';
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback';

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

const SCOPES = ['https://www.googleapis.com/auth/gmail.send'];

async function generateToken() {
  try {
    console.log('🔐 Gmail OAuth Token Generator');
    console.log('================================');
    console.log(`Client ID: ${CLIENT_ID}`);
    console.log(`Redirect URI: ${REDIRECT_URI}`);
    console.log('');

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent', // Force consent to get refresh token
    });

    console.log('📱 Step 1: Authorize this app by visiting:');
    console.log(url);
    console.log('');
    console.log('📋 Step 2: After authorization, you will get a code.');
    console.log('📝 Step 3: Copy that code and paste it below.');
    console.log('');

    const rl = readline.createInterface({ 
      input: process.stdin, 
      output: process.stdout 
    });

    rl.question('Enter the authorization code here: ', async (code) => {
      try {
        const { tokens } = await oauth2Client.getToken(code);
        
        console.log('');
        console.log('✅ Success! Here are your tokens:');
        console.log('================================');
        console.log(`Access Token: ${tokens.access_token}`);
        console.log(`Refresh Token: ${tokens.refresh_token}`);
        console.log('');
        console.log('🔒 Add this to your .env file:');
        console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
        console.log('');
        console.log('⚠️  Keep your refresh token secure and never commit it to version control!');
        
        rl.close();
      } catch (error) {
        console.error('❌ Error getting tokens:', error.message);
        rl.close();
      }
    });
  } catch (error) {
    console.error('❌ Error generating auth URL:', error.message);
  }
}

generateToken(); 