# NASTP HRMS - TalentTrackPro

A comprehensive Human Resource Management System (HRMS) built for NASTP recruitment portal. This full-stack application provides a modern, user-friendly interface for managing job applications, candidate profiles, and recruitment workflows.

## 🚀 Project Overview

**NASTP HRMS** is a recruitment portal that streamlines the hiring process with features for both administrators and candidates:

- **Admin Features**: Job management, candidate pipeline, email templates, analytics dashboard
- **Candidate Features**: Profile management, job applications, resume uploads
- **Modern Tech Stack**: React + TypeScript frontend, Express.js backend, PostgreSQL database

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Radix UI
- **Backend**: Express.js, TypeScript, Drizzle ORM
- **Database**: PostgreSQL with Neon serverless
- **Authentication**: JWT tokens with bcrypt password hashing
- **File Upload**: Multer for resume uploads
- **State Management**: TanStack Query for server state
- **Routing**: Wouter for client-side routing

### Project Structure
```
NASTP_HRMS/
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/     # Reusable UI components
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
│   └── seed.ts           # Initial data seeding
├── shared/                # Shared TypeScript schemas
│   └── schema.ts         # Database schema definitions
├── uploads/               # File upload directory
└── migrations/            # Database migrations
```

## 📋 Features

### Admin Dashboard
- **Job Management**: Create, edit, and manage job postings
- **Candidate Pipeline**: Track application statuses and manage candidates
- **Email Templates**: Create and manage email templates for communication
- **Analytics**: View job statistics and application metrics
- **Email Composition**: Send personalized emails to candidates

### Candidate Portal
- **Profile Management**: Complete profile with personal information
- **Education & Experience**: Add educational background and work experience
- **Resume Upload**: Upload and manage resume files (PDF, DOC, DOCX)
- **Job Applications**: Browse and apply to available positions
- **Application Tracking**: Monitor application status and updates

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL database (or Neon serverless)
- npm or yarn package manager

### 1. Clone the Repository
```bash
git clone <repository-url>
cd NASTP_HRMS
```

### 2. Install Dependencies
```bash
npm install
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
```

### 4. Database Setup
```bash
# Push database schema
npm run db:push

# Seed initial data (admin user and email templates)
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
- **jobs**: Job postings
- **applications**: Job applications
- **email_templates**: Email template management

### Key Relationships
- Users can have one candidate profile
- Candidates can have multiple education and experience entries
- Jobs can have multiple applications
- Applications link candidates to jobs

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
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Profile Management
- `GET /api/profile` - Get candidate profile
- `PUT /api/profile` - Update candidate profile
- `POST /api/education` - Add education
- `POST /api/experience` - Add experience
- `POST /api/resume` - Upload resume

### Job Management
- `GET /api/jobs` - List all jobs
- `POST /api/jobs` - Create new job
- `PUT /api/jobs/:id` - Update job
- `GET /api/jobs/:id` - Get job details

### Applications
- `GET /api/applications` - List applications
- `POST /api/applications` - Submit application
- `PUT /api/applications/:id` - Update application status

### Email Templates
- `GET /api/email-templates` - List email templates
- `POST /api/email-templates` - Create email template

## 🎨 UI Components

The application uses a comprehensive set of UI components built with:
- **Radix UI**: Accessible, unstyled components
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Beautiful icons
- **Framer Motion**: Smooth animations

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for password security
- **Role-based Access**: Admin and candidate role separation
- **File Upload Security**: File type and size validation
- **Input Validation**: Zod schema validation

## 📱 Responsive Design

The application is fully responsive and optimized for:
- Desktop computers
- Tablets
- Mobile devices

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

**NASTP HRMS** - Streamlining recruitment for the digital age.
