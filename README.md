# NASTP Recruitement Portal - AI-Powered Recruitement Portal (Custom Built for NASTP)

A Custom AI-Powered Human Resource Management (HRMS) + Applicant Tracking System (ATS) built for NASTP . This full-stack application provides a modern, user-friendly interface for managing job applications, candidate profiles, and recruitment workflows with advanced AI-powered features. You can clone it and use it for yourself, just make sure to remove the NASTP brandings. Open to contribution and improvement.

## 🚀 Project Overview

**NASTP Reccruitement Portal** is a AI-Powered Recruitment Portal that streamlines the hiring process with features for both administrators and candidates with AI automations and assistance:

- **Admin Features**: Job management, candidate pipeline, email templates, analytics dashboard, AI-powered resume scoring, assessment management
- **Candidate Features**: Profile management, job applications, resume uploads, skills management, assessment taking
- **AI Features**: Intelligent resume parsing, automated candidate scoring, chatbot assistant, assessment analytics
- **Modern Tech Stack**: React + TypeScript frontend, Express.js backend, PostgreSQL database, Redis caching

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Radix UI
- **Backend**: Express.js, TypeScript, Drizzle ORM
- **Database**: PostgreSQL with Neon serverless
- **Caching**: Redis for session management and token blacklisting
- **Authentication**: JWT tokens with httpOnly cookies and CSRF protection
- **File Upload**: Multer for resume uploads with OCR support
- **State Management**: TanStack Query for server state
- **Routing**: Wouter for client-side routing
- **AI Integration**: Groq API, scipy, TensorFlow, Mistral-7B.

### Project Structure
```
NASTP_HRMS/
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   │   ├── ui/        # shadcn/ui components
│   │   │   └── ChatbotWidget.tsx # AI chatbot interface
│   │   ├── pages/         # Route components
│   │   │   ├── admin/     # Admin-specific pages
│   │   │   └── candidate/ # Candidate-specific pages
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utilities and configurations
│   └── index.html
├── server/                 # Express.js backend
│   ├── index.ts           # Server entry point
│   ├── routes.ts          # API route definitions
│   ├── storage.ts         # Database operations
│   ├── db.ts             # Database connection
│   ├── redis.ts          # Redis cache management
│   ├── secrets.ts        # Secret management
│   ├── resume_parser/    # AI resume parsing
│   │   ├── ai_scoring.py # AI candidate scoring
│   │   └── extract_resume_text.py # Resume text extraction
│   └── seed.ts           # Initial data seeding
├── Chatbot/              # AI chatbot implementation
│   ├── groq_db_v2.py    # Main chatbot logic
│   └── requirements.txt  # Python dependencies
├── shared/                # Shared TypeScript schemas
│   └── schema.ts         # Database schema definitions
├── uploads/               # File upload directory
└── migrations/            # Database migrations
```

## 📋 Features

### 🤖 AI-Powered Features/ AI-Automations:

#### **Intelligent Resume Parsing**
- **OCR Support**: Extract text from scanned PDFs and images
- **Multi-format Support**: PDF, DOC, DOCX file processing
- **Automatic Text Extraction**: Converts resumes to searchable text
- **Error Handling**: Graceful fallback for parsing failures

#### **AI Candidate Scoring**
- **Automated Assessment**: AI evaluates candidates against job requirements
- **Multi-criteria Scoring**: Education, Skills, Experience, Relevance scores
- **Red Flag Detection**: Identifies potential issues (job hopping, gaps, etc.)
- **Weighted Scoring**: Configurable scoring weights per job
- **Detailed Reasoning**: AI provides explanation for each score

#### **AI Chatbot Assistant**
- **Role-based Responses**: Different responses for admins vs candidates
- **Company Information**: Access to mission, vision, benefits, FAQs
- **Job Recommendations**: AI-powered job matching
- **Real-time Chat**: Modern chat interface with conversation history
- **Error Recovery**: Automatic retry and fallback mechanisms

#### **Assessment Analytics**
- **Performance Metrics**: Average scores, pass rates, difficulty analysis
- **Question Analytics**: Per-question success rates
- **Candidate Trends**: Score progression over time
- **Job Correlation**: Assessment scores vs application outcomes

### 📊 Analytics & Reporting

#### **Dashboard KPIs**
- **Total Jobs Posted**: Real-time job count
- **Total Hires**: Successful recruitment metrics
- **Average Time to Hire**: Recruitment efficiency
- **Offer Acceptance Rate**: Candidate satisfaction
- **Cost per Hire**: Financial metrics

#### **Visual Analytics**
- **Time-to-Hire Trends**: Chart visualization
- **Source of Hire**: Recruitment channel analysis
- **Offer Acceptance Rates**: Job-specific metrics
- **Assessment Performance**: Detailed analytics

### 🎯 Assessment System

#### **Assessment Management**
- **Template Creation**: Build custom assessment templates
- **Question Types**: Multiple choice, coding challenges, scenario-based
- **Category Management**: Organize assessments by skill area
- **Duration Control**: Time-limited assessments
- **Passing Scores**: Configurable success thresholds

#### **Candidate Assessment Experience**
- **Online Testing**: Secure assessment platform
- **Progress Tracking**: Real-time completion status
- **Auto-submission**: Automatic submission on completion
- **Result Review**: Detailed score breakdown
- **Retry Logic**: Attempt management

### 👤 Enhanced Profile Management

#### **Skills Management**
- **Expertise Levels**: 1-5 scale (Beginner to Expert)
- **Dynamic Skills**: Add, edit, delete skills
- **Visual Indicators**: Slider-based expertise display
- **AI Integration**: Skills considered in AI scoring

#### **Profile Pictures**
- **Image Upload**: Profile picture management
- **Format Support**: JPG, PNG, GIF formats
- **Size Optimization**: Automatic resizing
- **Secure Storage**: Protected file access

#### **CNIC Integration**
- **Identity Verification**: CNIC number tracking
- **Data Validation**: Format verification
- **Privacy Protection**: Secure storage

### 🔍 Advanced Search & Filtering

#### **Resume Search**
- **Text-based Search**: Search resume content
- **Skill Filtering**: Filter by candidate skills
- **Experience Filtering**: Filter by years of experience
- **Education Filtering**: Filter by education level
- **AI Score Filtering**: Filter by AI assessment scores

#### **Application Pipeline**
- **Status Tracking**: Applied → Shortlisted → Interview → Hired → Onboarded
- **Bulk Operations**: Mass status updates
- **Filter Views**: Status-based filtering
- **Export Functionality**: CSV download for analysis

### 📧 Communication System

#### **Email Templates**
- **Template Management**: Create and manage email templates
- **Variable Support**: Dynamic content insertion
- **Bulk Sending**: Mass email capabilities
- **Status Tracking**: Email delivery tracking

#### **Email Composition**
- **Rich Text Editor**: Advanced email composition
- **Template Selection**: Choose from pre-built templates
- **Recipient Management**: Multiple recipient support
- **Draft Saving**: Save drafts for later

### 🔒 Security Features

#### **Enhanced Authentication**
- **httpOnly Cookies**: Secure JWT storage
- **CSRF Protection**: Cross-site request forgery prevention
- **Token Blacklisting**: Secure logout with Redis
- **Role-based Access**: Admin and candidate permissions
- **Session Management**: Redis-backed sessions

#### **File Security**
- **Type Validation**: Strict file type checking
- **Size Limits**: 5MB file size restrictions
- **Secure Uploads**: Protected file storage
- **Access Control**: Role-based file access

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL database (or Neon serverless)
- Python 3.8+ (for AI features)
- Redis (optional, for production)
- npm or yarn package manager

### 1. Clone the Repository
```bash
git clone <repository-url>
cd NASTP_HRMS
```

### 2. Install Dependencies
```bash
# Install Node.js dependencies
npm install

# Install Python dependencies for AI features
cd Chatbot
pip install -r requirements.txt
cd ..
```

### 3. Environment Configuration
Create a `.env` file in the root directory:
```env
# Database Configuration
DATABASE_URL=your_postgresql_connection_string

# JWT Configuration
JWT_SECRET=your_jwt_secret_key

# Server Configuration
NODE_ENV=development
PORT=5000

# AI Configuration
GROQ_API_KEY=your_groq_api_key

# Redis Configuration (optional)
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_URL=redis://127.0.0.1:6379
```

### 4. Database Setup
```bash
# Push database schema
npm run db:push

# Seed initial data (admin user, email templates, company info)
npm run seed
```

### 5. Start Development Server
```bash
# Start the development server
npm run dev
```

The application will be available at `http://localhost:5000`

## 🔐 Default Admin Credentials
After running the seed script, you can login with:
- **Email**: harisismail68@gmail.com
- **Password**: 12345678

## 📊 Database Schema

### Core Tables
- **users**: User authentication and roles
- **candidates**: Candidate profile information
- **education**: Educational background
- **experience**: Work experience
- **skills**: Candidate skills with expertise levels
- **jobs**: Job postings
- **applications**: Job applications with AI scores
- **email_templates**: Email template management
- **assessment_templates**: Assessment templates
- **assessment_questions**: Assessment questions
- **assessment_attempts**: Candidate assessment attempts
- **company_info**: Company information for chatbot
- **offers**: Job offers and acceptance tracking
- **job_costs**: Recruitment cost tracking

### Key Relationships
- Users can have one candidate profile
- Candidates can have multiple education, experience, and skills entries
- Jobs can have multiple applications with AI scores
- Applications link candidates to jobs with assessment results
- Assessment templates can have multiple questions
- Candidates can attempt multiple assessments

## 🚀 Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server

# Database
npm run db:push      # Push schema to database
npm run seed         # Seed initial data

# Type checking
npm run check        # TypeScript type checking

# Testing
npm run test         # Run test suite
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/logout` - User logout

### Profile Management
- `GET /api/profile` - Get candidate profile
- `PUT /api/profile` - Update candidate profile
- `POST /api/education` - Add education
- `POST /api/experience` - Add experience
- `POST /api/skills` - Add skill
- `PUT /api/skills/:id` - Update skill
- `DELETE /api/skills/:id` - Delete skill
- `POST /api/resume` - Upload resume
- `POST /api/upload-profile-picture` - Upload profile picture

### Job Management
- `GET /api/jobs` - List all jobs
- `POST /api/jobs` - Create new job
- `PUT /api/jobs/:id` - Update job
- `GET /api/jobs/:id` - Get job details
- `GET /api/jobs/:jobId/download-applications` - Download applications as CSV

### Applications
- `GET /api/applications` - List applications
- `POST /api/applications` - Submit application
- `PUT /api/applications/:id` - Update application status
- `POST /api/applications/:id/regenerate-ai-score` - Regenerate AI score

### AI Features
- `POST /api/chat` - Chatbot endpoint
- `POST /api/admin/batch-resume-extraction` - Batch resume processing
- `GET /api/admin/assessment-analytics` - Assessment analytics

### Assessment System
- `GET /api/assessment-templates` - List assessment templates
- `POST /api/assessment-templates` - Create assessment template
- `PUT /api/assessment-templates/:id` - Update assessment template
- `DELETE /api/assessment-templates/:id` - Delete assessment template
- `GET /api/assessment-templates/:id/questions` - Get assessment questions
- `POST /api/assessment-templates/:id/questions` - Add assessment question
- `GET /api/candidate/pending-assessments` - Get pending assessments
- `POST /api/assessment/:templateId/start` - Start assessment
- `POST /api/assessment/:templateId/submit` - Submit assessment

### Email Templates
- `GET /api/email-templates` - List email templates
- `POST /api/email-templates` - Create email template
- `POST /api/email/compose` - Send composed email

### Analytics
- `GET /api/dashboard/kpis` - Dashboard KPIs
- `GET /api/dashboard/visuals/time-to-hire` - Time to hire data
- `GET /api/dashboard/visuals/source-of-hire` - Source of hire data
- `GET /api/dashboard/visuals/offer-acceptance` - Offer acceptance data

## 🎨 UI Components

The application uses a comprehensive set of UI components built with:
- **Radix UI**: Accessible, unstyled components
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Beautiful icons
- **Framer Motion**: Smooth animations
- **Chart.js**: Data visualization
- **React Hook Form**: Form management

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication with httpOnly cookies
- **CSRF Protection**: Cross-site request forgery prevention
- **Password Hashing**: bcrypt for password security
- **Role-based Access**: Admin and candidate role separation
- **File Upload Security**: File type and size validation
- **Input Validation**: Zod schema validation
- **Token Blacklisting**: Secure logout with Redis support
- **Session Management**: Redis-backed session storage

## 📱 Responsive Design

The application is fully responsive and optimized for:
- Desktop computers
- Tablets
- Mobile devices

## 🤖 AI Integration

### Groq AI Integration
- **Resume Scoring**: AI-powered candidate evaluation
- **Chatbot Assistant**: Intelligent HR assistant
- **Assessment Analytics**: Performance analysis
- **Job Matching**: AI-powered job recommendations

### Python Integration
- **Resume Parsing**: Text extraction from various formats
- **OCR Processing**: Image-to-text conversion
- **AI Scoring**: Multi-criteria candidate evaluation
- **Error Handling**: Robust error recovery

## 🚀 Deployment

### Production Build
```bash
npm run build
npm run start
```

### Environment Variables for Production
Ensure all required environment variables are set in your production environment:
- `DATABASE_URL`
- `JWT_SECRET`
- `NODE_ENV=production`
- `GROQ_API_KEY` (for AI features)
- `REDIS_URL` (optional, for session management)

### Redis Setup (Optional)
For production deployments with high concurrency:
```bash
# Install Redis
docker run -d --name redis-server -p 6379:6379 redis:7-alpine

# Or use cloud Redis service
# Update REDIS_URL in environment variables
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions, please contact the development team or create an issue in the repository.

---

**NASTP HRMS** - Streamlining recruitment for the digital age with AI-powered intelligence.


***Update: 19/8/25
fixed multiple issues:
    - resume search functionality
    - profile view added to both above and recruitment pipeline.
    - added education must to save profile and candidate cannot apply until profile is min complete.
