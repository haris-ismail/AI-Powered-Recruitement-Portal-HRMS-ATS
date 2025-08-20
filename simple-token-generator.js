#!/usr/bin/env node

import { google } from 'googleapis';
import readline from 'readline';

console.log('🔐 Simple Gmail Token Generator');
console.log('================================');
console.log('');

// Your credentials
const CLIENT_ID = '724529091733-5cn0k68nde5prn1mno0f84b0nvr8ep8r.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REDIRECT_URI = 'http://localhost:5000/api/auth/google/callback';

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

const SCOPES = ['https://www.googleapis.com/auth/gmail.send'];

async function generateToken() {
  try {
    console.log('📋 Your credentials:');
    console.log(`Client ID: ${CLIENT_ID}`);
    console.log(`Client Secret: ${CLIENT_SECRET}`);
    console.log(`Redirect URI: ${REDIRECT_URI}`);
    console.log('');

    // Generate authorization URL
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent',
      response_type: 'code'
    });

    console.log('🔗 Step 1: Visit this URL in your browser:');
    console.log('');
    console.log(url);
    console.log('');
    console.log('📱 Step 2: Sign in with your Google account');
    console.log('🔐 Step 3: Grant permissions when prompted');
    console.log('📋 Step 4: Copy the authorization code from the URL');
    console.log('');

    const rl = readline.createInterface({ 
      input: process.stdin, 
      output: process.stdout 
    });

    rl.question('Enter the authorization code here: ', async (code) => {
      try {
        console.log('');
        console.log('🔄 Exchanging code for tokens...');
        
        const { tokens } = await oauth2Client.getToken(code);
        
        if (!tokens.refresh_token) {
          console.log('⚠️  No refresh token received. This usually means:');
          console.log('   - You\'ve already authorized this app before');
          console.log('   - Google didn\'t provide a refresh token');
          console.log('');
          console.log('🔧 Solution: Try revoking access and re-authorizing');
          console.log('   Go to: https://myaccount.google.com/permissions');
          console.log('   Find this app and click "Remove Access"');
          console.log('   Then run this script again');
        } else {
          console.log('✅ Success! Here are your tokens:');
          console.log('================================');
          console.log(`Access Token: ${tokens.access_token}`);
          console.log(`Refresh Token: ${tokens.refresh_token}`);
          console.log('');
          console.log('🔒 Add this to your .env file:');
          console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
          console.log('');
          console.log('⚠️  Keep your refresh token secure!');
        }
        
        rl.close();
      } catch (error) {
        console.error('');
        console.error('❌ Error getting tokens:', error.message);
        console.error('');
        console.error('🔧 Troubleshooting:');
        console.error('   - Make sure you\'re using a fresh authorization code');
        console.error('   - Check that your Google Cloud Console is configured correctly');
        console.error('   - Ensure Gmail API is enabled');
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

generateToken();
