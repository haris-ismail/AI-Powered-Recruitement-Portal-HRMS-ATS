# Gmail API Integration Setup Guide

## Overview
This guide explains how to set up Gmail API integration to replace the current `window.open(gmailUrl)` approach with proper backend email sending.

## Prerequisites
- Google Cloud Console access
- Gmail account for sending emails
- Node.js application with the required dependencies

## Step 1: Google Cloud Console Setup

### 1.1 Create/Select Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable billing if not already enabled

### 1.2 Enable Gmail API
1. Go to "APIs & Services" → "Library"
2. Search for "Gmail API"
3. Click on it and press "Enable"

### 1.3 Configure OAuth Consent Screen
1. Go to "APIs & Services" → "OAuth consent screen"
2. Choose "Internal" if using Google Workspace, or "External" for public
3. Fill in required fields:
   - App name: "NASTP HRMS"
   - User support email: Your email
   - Developer contact information: Your email
4. Save and continue

### 1.4 Create OAuth Credentials
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Application type: "Web application"
4. Add authorized redirect URIs:
   - `http://localhost:5000/api/auth/google/callback` (development)
   - `https://yourdomain.com/api/auth/google/callback` (production)
5. Download the JSON credentials file

## Step 2: Environment Configuration

Add these variables to your `.env` file:

```bash
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback
GOOGLE_REFRESH_TOKEN=your-refresh-token
```

## Step 3: Generate Refresh Token

### 3.1 Run the Token Generator
```bash
node getGmailToken.js
```

### 3.2 Follow the Authorization Flow
1. Copy the generated URL from the console
2. Open it in a browser
3. Sign in with your Gmail account
4. Grant permissions to the app
5. Copy the authorization code
6. Paste it back in the console
7. Copy the refresh token to your `.env` file

## Step 4: Database Migration

Run the migration to create the sent_emails table:

```bash
npm run db:push
```

## Step 5: Test the Integration

1. Start your server: `npm run dev`
2. Go to the email compose page
3. Select a template and candidate
4. Click "Send Email"
5. Check the console for success/error messages

## Troubleshooting

### Common Issues

1. **"Invalid client" error**
   - Verify CLIENT_ID and CLIENT_SECRET in .env
   - Ensure OAuth consent screen is configured

2. **"Invalid redirect URI" error**
   - Check REDIRECT_URI matches exactly what's in Google Console
   - Include protocol (http:// or https://)

3. **"No refresh token" error**
   - Ensure `prompt=consent` is set in OAuth flow
   - Delete existing tokens and re-authorize

4. **"Gmail API not enabled" error**
   - Enable Gmail API in Google Cloud Console
   - Wait a few minutes for changes to propagate

### Security Notes

- Never commit refresh tokens to version control
- Use environment variables for all sensitive data
- Regularly rotate refresh tokens
- Monitor API usage in Google Cloud Console

## API Endpoints

### Send Email
- **POST** `/api/send-email`
- Body: `{ templateId, candidateId, adminId }`
- Response: `{ success, message, recipient, subject }`

### Get Sent Emails
- **GET** `/api/sent-emails?candidateId=123`
- Response: Array of sent email records

## Email Logging

All sent emails are automatically logged to the `sent_emails` table with:
- Template used
- Candidate recipient
- Admin sender
- Subject and body
- Timestamp
- Status (sent/failed)
- Error messages (if any)

## Benefits

✅ **Professional Integration**: Uses official Gmail API
✅ **Automated Sending**: No manual Gmail redirects
✅ **Email Tracking**: Complete history of sent emails
✅ **Error Handling**: Failed emails are logged
✅ **Scalable**: Can handle bulk sending in future
✅ **Secure**: OAuth 2.0 authentication 