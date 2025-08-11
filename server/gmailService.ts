import { google } from 'googleapis';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '698347749849-ctith6ro5un87v2m5u8q3a5n4guandm9.apps.googleusercontent.com';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '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';
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback';
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// Set credentials if refresh token is available
if (REFRESH_TOKEN) {
  oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
}

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

export interface EmailData {
  from: string;
  to: string;
  subject: string;
  body: string;
}

export async function sendEmail({ from, to, subject, body }: EmailData): Promise<void> {
  try {
    if (!REFRESH_TOKEN) {
      throw new Error('Gmail refresh token not configured. Please set GOOGLE_REFRESH_TOKEN in environment variables.');
    }

    const messageParts = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      `Content-Type: text/html; charset=utf-8`,
      `MIME-Version: 1.0`,
      '',
      body,
    ];

    const rawMessage = Buffer.from(messageParts.join('\n'))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: rawMessage },
    });

    console.log(`✅ Email sent successfully to: ${to}`);
  } catch (error) {
    console.error('❌ Error sending email:', error);
    throw error;
  }
}

export async function generateAuthUrl(): Promise<string> {
  const SCOPES = ['https://www.googleapis.com/auth/gmail.send'];
  
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent', // Force consent to get refresh token
  });
  
  return url;
}

export async function getTokensFromCode(code: string): Promise<{ access_token: string; refresh_token: string }> {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    
    if (!tokens.refresh_token) {
      throw new Error('No refresh token received. Please ensure prompt=consent is set.');
    }
    
    return {
      access_token: tokens.access_token!,
      refresh_token: tokens.refresh_token
    };
  } catch (error) {
    console.error('Error getting tokens:', error);
    throw error;
  }
}

export function isConfigured(): boolean {
  return !!(CLIENT_ID && CLIENT_SECRET && REFRESH_TOKEN);
} 