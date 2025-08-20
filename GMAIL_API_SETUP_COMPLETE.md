# 🚀 NASTP HRMS - Complete Gmail API Setup Guide

## 📋 Overview

This guide will help you set up automated email sending using Gmail API in your NASTP HRMS application. The system is already fully implemented and just needs proper configuration.

## 🔑 Your Gmail API Credentials

- **Client ID**: `724529091733-5cn0k68nde5prn1mno0f84b0nvr8ep8r.apps.googleusercontent.com`
- **Client Secret**: `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`
- **Redirect URI**: `http://localhost:5000/api/auth/google/callback`

## 🚀 Quick Setup (Recommended)

### Step 1: Run the Setup Wizard

```bash
# Make sure you're in the project root directory
cd NASTP_HRMS

# Run the automated setup wizard
node setup-gmail-api.js
```

The wizard will:
- ✅ Verify your credentials
- 🔐 Generate authorization URL
- 📱 Guide you through OAuth2 flow
- 🔄 Exchange code for refresh token
- 📁 Create/update .env file automatically
- 🎉 Complete the setup

### Step 2: Follow the Interactive Prompts

1. **Copy the authorization URL** from the terminal
2. **Open it in your browser**
3. **Sign in with your Google account**
4. **Grant permissions** to the application
5. **Copy the authorization code**
6. **Paste it back in the terminal**

## 🔧 Manual Setup (Alternative)

If you prefer manual setup, follow these steps:

### Step 1: Create .env File

Create a `.env` file in the project root with:

```env
# Database Configuration
DATABASE_URL=postgresql://postgres:12345678@localhost:5433/nastp_db

# JWT Secret (generate a strong random string)
JWT_SECRET=your-super-secret-jwt-key-here-make-it-very-long-and-random

# Google OAuth2 Credentials
GOOGLE_CLIENT_ID=724529091733-5cn0k68nde5prn1mno0f84b0nvr8ep8r.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback

# Server Configuration
PORT=5000
NODE_ENV=development

# Redis Configuration (optional)
REDIS_URL=redis://localhost:6379
```

### Step 2: Generate Refresh Token

```bash
# Run the token generator
node getGmailToken.js

# Follow the prompts to get your refresh token
# Add the refresh token to your .env file
GOOGLE_REFRESH_TOKEN=your-refresh-token-here
```

## 🧪 Testing the Setup

### Step 1: Start the Server

```bash
npm run dev
```

### Step 2: Test Email Functionality

```bash
# Test the Gmail integration directly
node test_email.js
```

### Step 3: Test via Admin Panel

1. **Access Admin Panel**: http://localhost:3000/admin
2. **Login with admin credentials**
3. **Go to Email Templates** page
4. **Create a test template**
5. **Use Email Compose** to send test emails

## 📧 Email System Features

### ✅ What's Already Implemented

- **Email Templates Management**: Create, edit, delete reusable templates
- **Candidate Email Sending**: Send personalized emails to job applicants
- **Email History Tracking**: Log all sent emails with status
- **Gmail API Integration**: OAuth2 authentication with Gmail
- **HTML Email Support**: Rich formatting and styling
- **Admin Interface**: User-friendly email management UI

### 🔄 Email Flow

1. **Admin selects candidate** from applications
2. **Chooses email template** or creates custom content
3. **Customizes email** with candidate-specific information
4. **Sends email** via Gmail API
5. **Email is logged** to database with status
6. **History is tracked** for future reference

## 🛠️ API Endpoints

### Email Templates
- `GET /api/email-templates` - Fetch all templates
- `POST /api/email-templates` - Create new template
- `PUT /api/email-templates/:id` - Update template
- `DELETE /api/email-templates/:id` - Delete template

### Email Sending
- `POST /api/send-email` - Send email to candidate
- `GET /api/sent-emails` - Get email history
- `GET /api/sent-emails/:id` - Get specific email details

## 🔒 Security Considerations

### ✅ Best Practices
- **Never commit .env file** to version control
- **Use strong JWT secrets** (32+ characters)
- **Rotate refresh tokens** periodically
- **Monitor API usage** in Google Cloud Console
- **Use HTTPS** in production

### 🚨 Important Notes
- Refresh tokens are long-lived but can expire
- Keep your client secret secure
- Monitor Gmail API quotas and limits
- Implement rate limiting for production use

## 🚨 Troubleshooting

### Common Issues

#### 1. "Invalid client" Error
```bash
# Check your .env file has correct credentials
GOOGLE_CLIENT_ID=724529091733-5cn0k68nde5prn1mno0f84b0nvr8ep8r.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
```

#### 2. "No refresh token" Error
```bash
# Ensure prompt=consent is set in OAuth flow
# Delete existing tokens and re-authorize
# Use the setup wizard for proper flow
```

#### 3. "Database connection failed" Error
```bash
# Check if PostgreSQL is running on port 5433
# Verify DATABASE_URL in .env file
# Ensure database exists and is accessible
```

#### 4. "Gmail API quota exceeded" Error
```bash
# Check Google Cloud Console quotas
# Implement rate limiting
# Consider upgrading your Google Cloud plan
```

### Debug Commands

```bash
# Check environment variables
node -e "console.log(require('dotenv').config())"

# Test database connection
npm run test:db

# Test Gmail service
node test_email.js

# Check server logs
npm run dev
```

## 🎯 Next Steps After Setup

### 1. Create Email Templates
- Welcome emails for new candidates
- Application status updates
- Interview invitations
- Rejection notifications
- Offer letters

### 2. Test Email Flow
- Send test emails to yourself
- Verify email formatting
- Check email delivery
- Test with different templates

### 3. Integrate with Application Flow
- Connect to candidate applications
- Automate status update emails
- Set up email triggers
- Monitor email success rates

### 4. Production Deployment
- Use production Google Cloud project
- Set up proper domain redirects
- Implement email monitoring
- Set up backup email services

## 📚 Additional Resources

### Documentation
- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [Google Cloud Console](https://console.cloud.google.com/)
- [OAuth 2.0 Guide](https://developers.google.com/identity/protocols/oauth2)

### Support
- Check server logs for detailed error messages
- Verify Google Cloud Console configuration
- Test with the provided test scripts
- Review the Gmail service implementation

## 🎉 Success Indicators

You'll know the setup is complete when:

✅ **Server starts without errors**
✅ **Gmail service is configured**
✅ **Test emails send successfully**
✅ **Admin panel shows email templates**
✅ **Email compose functionality works**
✅ **Sent emails are logged to database**

---

## 🚀 Ready to Send Automated Emails!

Your NASTP HRMS application now has a fully functional automated email system powered by Gmail API. You can:

- 📧 Send personalized emails to candidates
- 📋 Manage email templates
- 📊 Track email history and success rates
- 🔄 Automate application status updates
- 🎯 Improve candidate communication

Start by creating your first email template and sending a test email to verify everything is working correctly!
