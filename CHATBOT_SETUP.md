# 🤖 Chatbot Setup Guide

## 📋 Prerequisites

Before setting up the chatbot, ensure you have:

- ✅ Node.js (v16+) and npm/yarn
- ✅ Python (v3.8+)
- ✅ PostgreSQL database
- ✅ Groq API account
- ✅ NASTP HRMS application running

---

## 🗂 Step 1: Database Setup

### 1.1 Run Database Migration

```bash
# Run the new migration to create company_info table
npm run db:migrate
```

### 1.2 Verify Database Tables

The following tables should exist:
- ✅ `users` - User authentication
- ✅ `candidates` - Candidate profiles
- ✅ `jobs` - Job listings
- ✅ `applications` - Job applications
- ✅ `company_info` - Company information for chatbot

---

## 🐍 Step 2: Python Environment Setup

### 2.1 Install Python Dependencies

```bash
cd Chatbot
pip install -r requirements.txt
```

### 2.2 Test Database Connection

```bash
cd Chatbot
python test_db_connection.py
```

Expected output:
```
✅ Database connection successful!
Available tables: ['users', 'candidates', 'jobs', 'applications', 'company_info']
✅ Company info table exists with 7 records
```

---

## 🔧 Step 3: Environment Variables

### 3.1 Required Environment Variables

Add these to your `.env` file:

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/your_hrms_db

# Groq AI
GROQ_API_KEY=your_groq_api_key_here

# JWT Secret (if not already set)
JWT_SECRET=your_jwt_secret_here
```

### 3.2 Get Groq API Key

1. Visit [Groq Console](https://console.groq.com/)
2. Create an account or sign in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key to your `.env` file

---

## ⚛ Step 4: Frontend Dependencies

### 4.1 Install Additional Dependencies

```bash
cd client
npm install lucide-react
```

### 4.2 Verify Components

The following files should exist:
- ✅ `client/src/components/ChatbotWidget.tsx`
- ✅ `client/src/lib/auth-migration.ts` (existing)

---

## 🔧 Step 5: Backend Integration

### 5.1 Verify API Route

The chatbot API route should be added to `server/routes.ts`:
- ✅ `POST /api/chat` - Chatbot endpoint

### 5.2 Test Backend

```bash
cd server
npm run dev
```

---

## 🚀 Step 6: Testing the Chatbot

### 6.1 Start the Application

```bash
# Terminal 1: Backend
cd server
npm run dev

# Terminal 2: Frontend
cd client
npm run dev
```

### 6.2 Test Chatbot Functionality

1. **Login to the application**
2. **Look for the chat button** (blue circle in bottom-right)
3. **Click the chat button** to open the chatbot
4. **Try these test messages:**

#### For Candidates:
- "What jobs are available?"
- "What's the company mission?"
- "What are the benefits?"
- "How do I apply for a job?"

#### For Admins:
- "Show me all candidates"
- "What's the application process?"
- "Tell me about the work environment"

---

## 🔍 Step 7: Troubleshooting

### 7.1 Common Issues

#### Python Dependencies
```bash
# If you get import errors
pip install --upgrade pip
pip install -r requirements.txt --force-reinstall
```

#### Database Connection
```bash
# Test database connection
cd Chatbot
python test_db_connection.py
```

#### Groq API Issues
```bash
# Test Groq API key
curl -H "Authorization: Bearer YOUR_GROQ_API_KEY" \
     https://api.groq.com/openai/v1/models
```

### 7.2 Debug Mode

Enable debug logging in the chatbot:

```python
# In Chatbot/groq_db_v2.py
logging.basicConfig(level=logging.DEBUG)
```

### 7.3 Check Logs

```bash
# Backend logs
cd server
npm run dev

# Python chatbot logs
cd Chatbot
python groq_db_v2.py --message "test" --user-id 1 --user-role candidate
```

---

## 📊 Step 8: Configuration Summary

### ✅ Checklist

- [ ] Database migration run
- [ ] Python dependencies installed
- [ ] Environment variables set
- [ ] Groq API key configured
- [ ] Frontend dependencies installed
- [ ] Backend API route added
- [ ] Chatbot widget integrated
- [ ] Database connection tested
- [ ] Chatbot functionality tested

### 🔧 Environment Variables Checklist

- [ ] `DATABASE_URL`
- [ ] `GROQ_API_KEY`
- [ ] `JWT_SECRET`

### 🗄 Database Tables Checklist

- [ ] `users`
- [ ] `candidates`
- [ ] `jobs`
- [ ] `applications`
- [ ] `company_info`

### 📁 File Structure Checklist

- [ ] `Chatbot/groq_db_v2.py`
- [ ] `Chatbot/requirements.txt`
- [ ] `Chatbot/test_db_connection.py`
- [ ] `client/src/components/ChatbotWidget.tsx`
- [ ] `migrations/0006_add_company_info_table.sql`
- [ ] `shared/schema.ts` (updated)

---

## 🎯 Features Implemented

### ✅ Core Functionality
- **Real-time chat interface**
- **Role-based access control**
- **Conversation history**
- **Error handling and retry**
- **Modern UI design**

### ✅ Chatbot Tools
- **Job listings** - Get active jobs
- **Company info** - Mission, vision, benefits
- **Candidate profiles** - User-specific data
- **Application status** - Track applications
- **Job recommendations** - AI-powered matching

### ✅ User Experience
- **Floating action button**
- **Responsive design**
- **Loading indicators**
- **Error messages**
- **Auto-scroll**
- **Clear chat functionality**

---

## 🚀 Next Steps

1. **Customize company information** in the database
2. **Add more chatbot tools** as needed
3. **Implement conversation persistence** across sessions
4. **Add analytics** for chatbot usage
5. **Optimize response times** with caching

---

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Verify all environment variables are set
3. Test database connectivity
4. Check Python dependencies
5. Review backend logs for errors

The chatbot is now fully integrated and ready to use! 🎉 