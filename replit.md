# Replit MD

## Overview

This is a full-stack HR recruitment management system built with React, Express, TypeScript, and PostgreSQL. The application serves two main user types: admins (HR managers) who can manage jobs and candidates, and candidates who can create profiles and apply for positions. The system features a complete recruitment pipeline from job posting to candidate onboarding.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state
- **Build Tool**: Vite with custom configuration for monorepo structure

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT tokens with bcrypt for password hashing
- **File Uploads**: Multer for resume file handling
- **Development**: Hot module replacement via Vite integration

### Database Architecture
- **ORM**: Drizzle with schema-first approach
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Schema Location**: Shared between client and server (`/shared/schema.ts`)
- **Migrations**: Drizzle Kit for database migrations

## Key Components

### Authentication System
- JWT-based authentication with role-based access control
- Two user roles: "admin" and "candidate"
- Token stored in localStorage with automatic expiration handling
- Protected routes with AuthGuard component

### User Management
- **Admin Users**: Can manage jobs, view candidate pipeline, send emails
- **Candidate Users**: Can create profiles, apply for jobs, track application status
- Profile management with personal information, education, and experience

### Job Management System
- Job posting with templates for reusability
- Job status management (active/inactive)
- Department and experience level categorization
- Rich text job descriptions

### Application Pipeline
- Multi-stage recruitment process: Applied → Shortlisted → Interview → Hired → Onboarded
- Admin dashboard for managing candidate progression
- Status tracking and notifications

### File Upload System
- Resume upload functionality with file type validation (PDF, DOC, DOCX)
- 5MB file size limit
- Secure file storage with unique naming

### Email System
- Email template management for standardized communications
- Template-based email sending to candidates
- Integration with recruitment pipeline stages

## Data Flow

### Authentication Flow
1. User submits login credentials
2. Server validates credentials and generates JWT token
3. Token stored client-side and included in subsequent API requests
4. AuthGuard component protects routes based on user role

### Job Application Flow
1. Admin creates job posting (optionally from template)
2. Candidate views available jobs and applies
3. Application enters pipeline at "Applied" stage
4. Admin reviews applications and updates status
5. System tracks progression through recruitment stages

### Profile Management Flow
1. Candidate creates/updates personal profile
2. Education and experience entries managed as separate entities
3. Resume upload handled with file validation
4. Data synchronized with server via optimistic updates

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connection
- **drizzle-orm**: Database ORM and query builder
- **@tanstack/react-query**: Server state management
- **bcryptjs**: Password hashing
- **jsonwebtoken**: JWT token generation/validation
- **multer**: File upload handling

### UI Dependencies
- **@radix-ui/***: Headless UI component primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **lucide-react**: Icon library

### Development Dependencies
- **vite**: Build tool and development server
- **tsx**: TypeScript execution for development
- **esbuild**: Production bundling

## Deployment Strategy

### Development Environment
- Vite dev server with HMR for frontend
- tsx for TypeScript execution in development
- Integrated development setup with API proxy

### Production Build
- Frontend: Vite build outputting to `dist/public`
- Backend: esbuild bundling server code to `dist/index.js`
- Environment variables for database connection and JWT secrets

### Database Management
- Drizzle migrations for schema changes
- Database URL configuration via environment variables
- Schema shared between client and server for type safety

### File Storage
- Local file system storage in `uploads/` directory
- File naming with timestamps and random suffixes
- MIME type validation for security

The application follows a monorepo structure with clear separation between client, server, and shared code, enabling efficient development and type safety across the full stack.