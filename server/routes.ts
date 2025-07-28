import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import { insertUserSchema, insertCandidateSchema, insertEducationSchema, insertExperienceSchema, insertJobSchema, insertJobTemplateSchema, insertApplicationSchema, insertEmailTemplateSchema, insertSkillSchema, type SearchFilters } from "@shared/schema";
import { z } from "zod";
import { spawn } from "child_process";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { applications, offers, jobCosts, users } from "@shared/schema";
import crypto from "crypto";
import { redisService } from "./redis";
import { secretManager } from "./secrets";

// Initialize secret manager
const secrets = secretManager.initialize();
const JWT_SECRET = secrets.jwtSecret;

// Multer configuration for file uploads
const storage_multer = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'resume-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage_multer,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, and DOCX files are allowed'));
    }
  }
});

// Multer configuration for profile picture uploads
const storage_picture = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadPicture = multer({
  storage: storage_picture,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpg|jpeg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only JPG, JPEG, and PNG files are allowed'));
    }
  }
});

// Middleware to verify JWT token from httpOnly cookies
const authenticateToken = async (req: any, res: any, next: any) => {
  try {
    // First try to get token from httpOnly cookie
    const token = req.cookies?.jwt_token;
    
    // Fallback to Authorization header for backward compatibility during migration
    const authHeader = req.headers['authorization'];
    const headerToken = authHeader && authHeader.split(' ')[1];
    
    const finalToken = token || headerToken;

    if (!finalToken) {
      return res.status(401).json({ message: 'Access token required' });
    }

    // Check if token is blacklisted
    const isBlacklisted = await redisService.isTokenBlacklisted(finalToken);
    if (isBlacklisted) {
      return res.status(401).json({ message: 'Token has been revoked' });
    }

    jwt.verify(finalToken, JWT_SECRET, (err: any, user: any) => {
      if (err) {
        return res.status(403).json({ message: 'Invalid token' });
      }
      req.user = user;
      next();
    });
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ message: 'Authentication failed' });
  }
};

// CSRF protection middleware
const csrfProtection = (req: any, res: any, next: any) => {
  // Skip CSRF for GET requests and API endpoints that don't modify state
  if (req.method === 'GET' || req.path.includes('/auth/')) {
    return next();
  }
  
  const csrfToken = req.headers['x-csrf-token'] || req.body._csrf;
  const sessionToken = req.cookies?.csrf_token;
  
  if (!csrfToken || !sessionToken || csrfToken !== sessionToken) {
    return res.status(403).json({ message: 'CSRF token validation failed' });
  }
  
  next();
};

// Role-based access control
const requireRole = (role: string) => {
  return (req: any, res: any, next: any) => {
    if (req.user.role !== role) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Create uploads directory
  const fs = await import('fs');
  if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
  }

  // Auth routes
  app.post('/api/auth/login', async (req, res) => {
    try {
      console.log('\n=== NEW LOGIN ATTEMPT ===');
      console.log('Request headers:', JSON.stringify(req.headers, null, 2));
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      
      const { email, password } = req.body;
      
      if (!email || !password) {
        console.log('❌ Error: Missing email or password');
        return res.status(400).json({ message: 'Email and password are required' });
      }
      
      console.log('🔑 Login attempt for email:', email);
      
      // Log database query
      console.log('🔍 Querying database for user...');
      const user = await storage.getUserByEmail(email);
      console.log('✅ Database query completed');
      
      if (!user) {
        console.log('❌ No user found with email:', email);
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      console.log('👤 User found in database:', {
        id: user.id,
        email: user.email,
        role: user.role,
        passwordHash: user.password
      });
      
      // Log password comparison
      console.log('🔑 Comparing provided password...');
      const validPassword = await bcrypt.compare(password, user.password);
      console.log('🔑 Password comparison result:', validPassword);
      
      if (!validPassword) {
        console.log('❌ Invalid password for user:', email);
        console.log('Provided password:', password);
        console.log('Stored hash:', user.password);
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Generate CSRF token
      const csrfToken = crypto.randomBytes(32).toString('hex');

      // Set httpOnly cookie with JWT token
      res.cookie('jwt_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        path: '/'
      });

      // Set CSRF token as httpOnly cookie
      res.cookie('csrf_token', csrfToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        path: '/'
      });

      // Return user data and CSRF token (not the JWT)
      res.json({ 
        user: { 
          id: user.id, 
          email: user.email, 
          role: user.role 
        },
        csrfToken // Client needs this for CSRF protection
      });
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Server error', details: error.message });
    }
  });

  // Logout endpoint - blacklist the current token
  app.post('/api/auth/logout', authenticateToken, async (req: any, res) => {
    try {
      const token = req.cookies?.jwt_token;
      
      if (token) {
        // Blacklist the current token
        await redisService.blacklistToken(token, 86400); // 24 hours
        
        // Invalidate user session
        if (req.user?.id) {
          await redisService.invalidateUserSession(req.user.id);
        }
      }

      // Clear cookies
      res.clearCookie('jwt_token', { path: '/' });
      res.clearCookie('csrf_token', { path: '/' });

      res.json({ message: 'Logged out successfully' });
    } catch (error: any) {
      console.error('Logout error:', error);
      res.status(500).json({ message: 'Logout failed' });
    }
  });

  // Force logout all sessions for a user (admin only)
  app.post('/api/auth/force-logout/:userId', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Invalidate all sessions for the user
      await redisService.invalidateUserSession(userId);
      
      res.json({ message: 'All sessions invalidated for user' });
    } catch (error: any) {
      console.error('Force logout error:', error);
      res.status(500).json({ message: 'Force logout failed' });
    }
  });

  app.post('/api/auth/register', async (req, res) => {
    try {
      // Extract user data (email, password) and candidate data (cnic) separately
      const { email, password, cnic } = req.body;
      
      // Validate user data
      const userData = insertUserSchema.parse({ email, password });
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        console.log('Registration failed: User already exists', { email: userData.email });
        return res.status(400).json({ message: 'User with this email already exists' });
      }

      // Check CNIC uniqueness
      const cnic = req.body.cnic;
      if (!cnic) {
        console.log('Registration failed: CNIC is required');
        return res.status(400).json({ message: 'CNIC is required' });
      }
      
      const existingCnic = await storage.getCandidateByCnic(cnic);
      if (existingCnic) {
        console.log('Registration failed: CNIC already exists', { cnic });
        return res.status(400).json({ message: 'CNIC already registered' });
      }

      // Check CNIC uniqueness
      if (!cnic) {
        return res.status(400).json({ message: 'CNIC is required' });
      }
      const existingCnic = await storage.getCandidateByCnic(cnic);
      if (existingCnic) {
        return res.status(400).json({ message: 'CNIC already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      // Create user first
      const user = await storage.createUser({
        email: userData.email,
        password: hashedPassword,
        role: 'candidate'
      });

      // Create candidate profile
      const candidate = await storage.createCandidate({
        userId: user.id,
        cnic,
        firstName: req.body.firstName || '',
        lastName: req.body.lastName || ''
      });
      
      console.log('Candidate profile created:', { candidateId: candidate.id, userId: user.id });

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Generate CSRF token
      const csrfToken = crypto.randomBytes(32).toString('hex');

      // Set httpOnly cookie with JWT token
      res.cookie('jwt_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        path: '/'
      });

      // Set CSRF token as httpOnly cookie
      res.cookie('csrf_token', csrfToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        path: '/'
      });

      res.status(201).json({ 
        user: { 
          id: user.id, 
          email: user.email, 
          role: user.role 
        },
        csrfToken
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid input', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error', details: error.message });
    }
  });

  // Change password endpoint - invalidates all existing tokens
  app.post('/api/auth/change-password', authenticateToken, async (req: any, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id;

      // Get user from database
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Verify current password
      const validPassword = await bcrypt.compare(currentPassword, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      // Update password in database
      await db.update(users).set({ 
        password: hashedNewPassword
      }).where(eq(users.id, userId));

      // Invalidate all existing sessions for this user
      await redisService.invalidateUserSession(userId);

      // Blacklist current token
      const currentToken = req.cookies?.jwt_token;
      if (currentToken) {
        await redisService.blacklistToken(currentToken, 86400);
      }

      // Clear current session cookies
      res.clearCookie('jwt_token', { path: '/' });
      res.clearCookie('csrf_token', { path: '/' });

      res.json({ message: 'Password changed successfully. Please login again.' });
    } catch (error: any) {
      console.error('Change password error:', error);
      res.status(500).json({ message: 'Password change failed' });
    }
  });

  // Profile routes
  app.get('/api/profile', authenticateToken, async (req: any, res) => {
    try {
      const candidate = await storage.getCandidate(req.user.id);
      if (!candidate) {
        return res.status(404).json({ message: 'Profile not found' });
      }

      const education = await storage.getCandidateEducation(candidate.id);
      const experience = await storage.getCandidateExperience(candidate.id);

      res.json({
        ...candidate,
        education,
        experience
      });
    } catch (error: unknown) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.put('/api/profile', authenticateToken, async (req: any, res) => {
    try {
      const candidate = await storage.getCandidate(req.user.id);
      if (!candidate) {
        return res.status(404).json({ message: 'Profile not found' });
      }

      const profileData = insertCandidateSchema.partial().parse(req.body);
      // If CNIC is being updated, check uniqueness
      if (profileData.cnic && profileData.cnic !== candidate.cnic) {
        const existingCnic = await storage.getCandidateByCnic(profileData.cnic);
        if (existingCnic) {
          return res.status(400).json({ message: 'CNIC already exists' });
        }
      }
      const updatedCandidate = await storage.updateCandidate(candidate.id, profileData);

      res.json(updatedCandidate);
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid input', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Education routes
  app.post('/api/education', authenticateToken, async (req: any, res) => {
    try {
      const candidate = await storage.getCandidate(req.user.id);
      if (!candidate) {
        return res.status(404).json({ message: 'Profile not found' });
      }

      const educationData = insertEducationSchema.parse({
        ...req.body,
        candidateId: candidate.id
      });

      const education = await storage.createEducation(educationData);
      res.status(201).json(education);
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid input', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.delete('/api/education/:id', authenticateToken, async (req: any, res) => {
    try {
      await storage.deleteEducation(parseInt(req.params.id));
      res.status(204).send();
    } catch (error: unknown) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Experience routes
  app.post('/api/experience', authenticateToken, async (req: any, res) => {
    try {
      const candidate = await storage.getCandidate(req.user.id);
      if (!candidate) {
        return res.status(404).json({ message: 'Profile not found' });
      }

      const experienceData = insertExperienceSchema.parse({
        ...req.body,
        candidateId: candidate.id
      });

      const experience = await storage.createExperience(experienceData);
      res.status(201).json(experience);
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid input', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.delete('/api/experience/:id', authenticateToken, async (req: any, res) => {
    try {
      await storage.deleteExperience(parseInt(req.params.id));
      res.status(204).send();
    } catch (error: unknown) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Resume upload
  app.post('/api/upload-resume', authenticateToken, upload.single('resume'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const candidate = await storage.getCandidate(req.user.id);
      if (!candidate) {
        return res.status(404).json({ message: 'Profile not found' });
      }

      const resumeUrl = `/uploads/${req.file.filename}`;
      const resumePath = req.file.path;

      // Call Python script to extract resume text
      let resumeText = '';
      try {
        const python = spawn('python', [
          './server/resume_parser/extract_resume_text.py',
          resumePath
        ], {
          env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
        });
        let output = '';
        let errorOutput = '';
        python.stdout.on('data', (data) => {
          output += data.toString();
        });
        python.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });
        await new Promise((resolve, reject) => {
          python.on('close', (code) => {
            if (code === 0) {
              resumeText = output;
              resolve(null);
            } else {
              console.error('Resume parsing error:', errorOutput);
              resumeText = '';
              resolve(null); // Don't block upload on parsing error
            }
          });
        });
      } catch (err) {
        console.error('Failed to parse resume:', err);
        resumeText = '';
      }

      await storage.updateCandidate(candidate.id, { resumeUrl, resumeText });

      res.json({ resumeUrl, resumeText });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Profile picture upload endpoint
  app.post('/api/upload-profile-picture', authenticateToken, uploadPicture.single('profilePicture'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      const candidate = await storage.getCandidate(req.user.id);
      if (!candidate) {
        return res.status(404).json({ message: 'Profile not found' });
      }
      const profilePictureUrl = `/uploads/${req.file.filename}`;
      await storage.updateCandidate(candidate.id, { profilePicture: profilePictureUrl });
      res.json({ profilePicture: profilePictureUrl });
    } catch (error: unknown) {
      res.status(500).json({ message: 'Failed to upload profile picture' });
    }
  });

  // Get current user endpoint
  app.get('/api/auth/me', authenticateToken, (req: any, res) => {
    res.json({
      id: req.user.id,
      email: req.user.email,
      role: req.user.role
    });
  });

  // Logout endpoint
  app.post('/api/auth/logout', (req, res) => {
    // Clear JWT cookie
    res.clearCookie('jwt_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    });

    // Clear CSRF cookie
    res.clearCookie('csrf_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    });

    res.json({ message: 'Logged out successfully' });
  });

  // Job routes
  app.get('/api/jobs', async (req, res) => {
    try {
      const jobs = await storage.getJobs();
      res.json(jobs);
    } catch (error: unknown) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/jobs', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      const jobData = insertJobSchema.parse(req.body);
      const job = await storage.createJob(jobData);
      res.status(201).json(job);
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid input', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.put('/api/jobs/:id', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const jobData = insertJobSchema.partial().parse(req.body);
      
      // If assessmentTemplateId is being updated
      if (jobData.assessmentTemplateId !== undefined) {
        // Remove existing assessment from job_assessments if it exists
        const existingAssessment = await storage.getJobAssessments(jobId);
        if (existingAssessment && existingAssessment.length > 0) {
          await storage.deleteJobAssessment(existingAssessment[0].id);
        }
        
        // If a new assessment template is being set
        if (jobData.assessmentTemplateId) {
          await storage.createJobAssessment(jobId, {
            templateId: jobData.assessmentTemplateId
          });
        }
      }
      
      const job = await storage.updateJob(jobId, jobData);
      res.json(job);
    } catch (error: unknown) {
      console.error('Job update error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid input', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Job templates
  app.get('/api/job-templates', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      const templates = await storage.getJobTemplates();
      res.json(templates);
    } catch (error: unknown) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/job-templates', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      const templateData = insertJobTemplateSchema.parse(req.body);
      const template = await storage.createJobTemplate(templateData);
      res.status(201).json(template);
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid input', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.put('/api/job-templates/:id', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      const templateData = insertJobTemplateSchema.partial().parse(req.body);
      const template = await storage.updateJobTemplate(parseInt(req.params.id), templateData);
      res.json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid input', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.delete('/api/job-templates/:id', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      await storage.deleteJobTemplate(parseInt(req.params.id));
      res.status(204).send();
    } catch (error: unknown) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Application routes
  app.get('/api/applications', authenticateToken, async (req: any, res) => {
    try {
      if (req.user.role === 'admin') {
        const applications = await storage.getApplications();
        res.json(applications);
      } else {
        const candidate = await storage.getCandidate(req.user.id);
        if (!candidate) {
          return res.status(404).json({ message: 'Profile not found' });
        }
        const applications = await storage.getApplicationsByCandidate(candidate.id);
        res.json(applications);
      }
    } catch (error: unknown) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Assessment interfaces
  interface AssessmentStartRequest {
    jobId?: string;
  }

  interface AssessmentStartResponse {
    attemptId: number;
    success: boolean;
    message: string;
    templateId: number;
    status?: string;
  }

  // Job templates
  app.get('/api/job-templates', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      const templates = await storage.getJobTemplates();
      res.json(templates);
    } catch (error: unknown) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/job-templates', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      const templateData = insertJobTemplateSchema.parse(req.body);
      const template = await storage.createJobTemplate(templateData);
      res.status(201).json(template);
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid input', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error' });
    }
});

app.delete('/api/job-templates/:id', authenticateToken, requireRole('admin'), async (req: any, res) => {
  try {
    await storage.deleteJobTemplate(parseInt(req.params.id));
    res.status(204).send();
  } catch (error: unknown) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Application routes
app.get('/api/applications', authenticateToken, async (req: any, res) => {
  try {
    if (req.user.role === 'admin') {
      const applications = await storage.getApplications();
      return res.json(applications);
    } else {
      const candidate = await storage.getCandidate(req.user.id);
      console.log('Candidate fetched:', candidate);
      if (!candidate) {
        return res.status(404).json({ message: 'Profile not found' });
      }

      const applicationData = insertApplicationSchema.parse({
        ...req.body,
        candidateId: candidate.id
      });
      console.log('Application data to create:', applicationData);

      const application = await storage.createApplication(applicationData);
      console.log('Application created:', application);

      // --- AI SCORING INTEGRATION ---
      try {
        const profile = await storage.getCandidateWithProfile(candidate.id);
        const skills = await storage.getCandidateSkills(candidate.id);
        const job = await storage.getJob(application.jobId);
        if (!profile.resumeText) {
          return res.status(400).json({ message: 'Please upload a resume before applying for a job.' });
        }
        const resumeText = profile.resumeText;
        const experience_dates = (profile.experience || []).map(e => [e.fromDate, e.toDate]);
        const education_dates = (profile.education || []).map(e => [e.fromDate, e.toDate]);
        const aiInput = {
          resume: resumeText,
          job_description: job?.description || '',
          experience_dates,
          education_dates,
          groq_api_key: process.env.GROQ_API_KEY || undefined
        };
        console.log('AI input:', aiInput);
        // When spawning the Python process for AI scoring, pass the environment explicitly
        const py = spawn('python', ['server/resume_parser/ai_scoring.py'], {
          env: { ...process.env }
        });
        let output = '';
        let errorOutput = '';
        py.stdout.on('data', (data) => { output += data.toString(); });
        py.stderr.on('data', (data) => { errorOutput += data.toString(); });
        py.stdin.write(JSON.stringify(aiInput));
        py.stdin.end();
        await new Promise((resolve) => {
          py.on('close', () => resolve(null));
        });
        console.log('AI script output:', output);
        if (errorOutput) console.error('AI script error output:', errorOutput);
        let aiResult;
        try {
          aiResult = JSON.parse(output);
        } catch (e) {
          console.error('Error parsing AI script output:', output, e);
          aiResult = null;
        }
        console.log('Parsed AI result:', aiResult);
        if (aiResult && aiResult.WeightedScore !== undefined) {
          await storage.updateApplication(application.id, {
            ai_score: aiResult.WeightedScore,
            ai_score_breakdown: aiResult.Scores,
            red_flags: aiResult.RedFlag
          });
        } else {
          console.error('AI result missing WeightedScore or is null:', aiResult);
        }
      } catch (err) {
        console.error('AI scoring error:', err);
      }
      // --- END AI SCORING INTEGRATION ---

      res.status(201).json(application);
    } catch (error) {
      console.error('Error in POST /api/applications:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid input', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error' });
    }
  } catch (error: unknown) {
    console.error('Error fetching applications:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch applications';
    return res.status(500).json({ 
      success: false, 
      message: errorMessage 
    });
  }
});

  interface ApplicationRequest {
    jobId: string;
    status?: string;
  }

  interface ApplicationResponse {
    success: boolean;
    message: string;
    application?: any;
    error?: string;
    details?: string;
  }

  app.post('/api/applications', authenticateToken, async (req: any, res) => {
    try {
      const { jobId, status } = req.body as ApplicationRequest;
      if (!jobId || isNaN(parseInt(jobId))) {
        return res.status(400).json({ message: 'Invalid job ID' });
      }

      const candidate = await storage.getCandidate(req.user.id);
      if (!candidate) {
        return res.status(404).json({ message: 'Candidate not found' });
      }

      const job = await storage.getJobById(parseInt(jobId));
      if (!job) {
        return res.status(404).json({
          message: 'Job not found',
          jobId: jobId
        });
      }

      const existingApplication = await storage.getApplicationByCandidateAndJob(candidate.id, parseInt(jobId));
      if (existingApplication) {
        return res.status(400).json({ 
          message: 'You have already applied to this job',
          jobId: jobId,
          candidateId: candidate.id
        });
      }

      const assessments = await storage.getAssessmentsByJob(parseInt(jobId));
      const requiredAssessments = assessments.filter(a => a.isRequired);
      
      if (requiredAssessments.length > 0) {
        const completedAssessments = await storage.getCandidateAssessments(candidate.id);
        const pendingAssessments = requiredAssessments.filter(a => 
          !completedAssessments.find(ca => 
            ca.templateId === a.templateId && 
            ca.jobId === parseInt(jobId) && 
            ca.status === 'completed'
          )
        );

        if (pendingAssessments.length > 0) {
          const pendingAssessment = pendingAssessments[0];
          return res.status(400).json({
            message: 'Required assessment not completed',
            assessmentId: pendingAssessment.templateId,
            jobId: jobId,
            required: true
          });
        }
      }

      const applicationData = {
        jobId: parseInt(jobId),
        candidateId: candidate.id,
        status: status || 'pending',
        appliedAt: new Date()
      };

      try {
        const application = await storage.createApplication(applicationData);
        res.status(201).json({
          success: true,
          message: 'Application submitted successfully',
          application
        } as ApplicationResponse);
      } catch (createError: unknown) {
        console.error('=== APPLICATION CREATION ERROR ===', createError);
        const createErrorMessage = createError instanceof Error ? createError.message : 'Failed to create application';
        const createErrorDetails = createError instanceof Error ? createError.stack : 'No details available';
        res.status(500).json({ 
          message: 'Failed to create application', 
          error: createErrorMessage,
          details: createErrorDetails
        } as ApplicationResponse);
      }
    } catch (error: unknown) {
      console.error('=== UNEXPECTED ERROR IN APPLICATION CREATION ===', error);
      const errorMessage = error instanceof Error ? error.message : 'Server error';
      const errorDetails = error instanceof Error ? error.stack : 'No details available';
      res.status(500).json({ 
        message: 'Server error', 
        error: errorMessage,
        details: errorDetails
      } as ApplicationResponse);
    }
  });

  // Admin: Regenerate AI score for an application with custom weights
  app.post('/api/applications/:id/regenerate-score', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      const applicationId = parseInt(req.params.id);
      const weights = req.body.weights;
      // Fetch application
      const application = await storage.getApplication(applicationId);
      if (!application) {
        return res.status(404).json({ message: 'Application not found' });
      }
      // Fetch candidate profile
      const profile = await storage.getCandidateWithProfile(application.candidateId);
      const skills = await storage.getCandidateSkills(application.candidateId);
      // Fetch job
      const job = await storage.getJob(application.jobId);
      // Only use extracted resume text from DB
      if (!profile.resumeText) {
        return res.status(400).json({ message: 'Please upload a resume before applying for a job.' });
      }
      const resumeText = profile.resumeText;
      const experience_dates = (profile.experience || []).map(e => [e.fromDate, e.toDate]);
      const education_dates = (profile.education || []).map(e => [e.fromDate, e.toDate]);
      const aiInput = {
        resume: resumeText,
        job_description: job?.description || '',
        experience_dates,
        education_dates,
        weights,
        groq_api_key: process.env.GROQ_API_KEY || undefined
      };
      console.log('AI input (regenerate):', aiInput);
      const { spawn } = (await import('child_process'));
      const py = spawn('python', ['./server/resume_parser/ai_scoring.py'], {
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
      });
      let output = '';
      let errorOutput = '';
      py.stdout.on('data', (data: any) => { output += data.toString(); });
      py.stderr.on('data', (data: any) => { errorOutput += data.toString(); });
      py.stdin.write(JSON.stringify(aiInput));
      py.stdin.end();
      await new Promise((resolve) => {
        py.on('close', () => resolve(null));
      });
      console.log('AI script output (regenerate):', output);
      if (errorOutput) console.error('AI script error output (regenerate):', errorOutput);
      let aiResult;
      try {
        aiResult = JSON.parse(output);
      } catch (e: any) {
        console.error('Error parsing AI script output (regenerate):', output, e);
        aiResult = null;
      }
      console.log('Parsed AI result (regenerate):', aiResult);
      if (aiResult && aiResult.WeightedScore !== undefined) {
        await storage.updateApplication(applicationId, {
          ai_score: aiResult.WeightedScore,
          ai_score_breakdown: aiResult.Scores,
          red_flags: aiResult.RedFlag
        });
      }
      // Fetch updated application
      const updated = await storage.getApplication(applicationId);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: 'Failed to regenerate AI score', details: error?.message });
    }
  });

  // Batch regenerate AI scores for all applications of a job
  app.post('/api/jobs/:jobId/regenerate-scores', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const weights = req.body.weights;
      if (!weights || typeof weights !== 'object') {
        return res.status(400).json({ message: 'Weights are required.' });
      }
      // Fetch all applications for the job
      const applications = await storage.getApplicationsByJob(jobId);
      const job = await storage.getJob(jobId);
      if (!job) {
        return res.status(404).json({ message: 'Job not found.' });
      }
      let updated = [];
      for (const application of applications) {
        const profile = await storage.getCandidateWithProfile(application.candidateId);
        if (!profile || !profile.resumeText) {
          continue; // Skip if no profile or resume
        }
        const experience_dates = (profile.experience || []).map((e: any) => [e.fromDate, e.toDate]);
        const education_dates = (profile.education || []).map((e: any) => [e.fromDate, e.toDate]);
        const aiInput = {
          resume: profile.resumeText,
          job_description: job.description || '',
          experience_dates,
          education_dates,
          weights,
          groq_api_key: process.env.GROQ_API_KEY || undefined
        };
        const { spawn } = await import('child_process');
        let output = '';
        let errorOutput = '';
        const py = spawn('python', ['./server/resume_parser/ai_scoring.py'], {
          env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
        });
        py.stdout.on('data', (data: any) => { output += data.toString(); });
        py.stderr.on('data', (data: any) => { errorOutput += data.toString(); });
        py.stdin.write(JSON.stringify(aiInput));
        py.stdin.end();
        await new Promise((resolve) => {
          py.on('close', () => resolve(null));
        });
        let aiResult;
        try {
          aiResult = JSON.parse(output);
        } catch (e: any) {
          aiResult = null;
        }
        if (aiResult && aiResult.WeightedScore !== undefined) {
          await storage.updateApplication(application.id, {
            ai_score: aiResult.WeightedScore,
            ai_score_breakdown: aiResult.Scores,
            red_flags: aiResult.RedFlag
          });
          updated.push({ applicationId: application.id, ai_score: aiResult.WeightedScore, red_flags: aiResult.RedFlag });
        }
      }
      res.json({ updated });
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to batch regenerate AI scores', details: error?.message });
    }
  });

  // Email templates
  app.get('/api/email-templates', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      const templates = await storage.getEmailTemplates();
      res.json(templates);
    } catch (error: unknown) {
      console.error('Error getting email templates:', error);
      const errorMessage = error instanceof Error ? error.message : 'Server error';
      const errorDetails = error instanceof Error ? error.stack : 'No details available';
      res.status(500).json({ 
        message: 'Server error', 
        error: errorMessage,
        details: errorDetails
      });
    }
  });

  app.post('/api/email-templates', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      const templateData = insertEmailTemplateSchema.parse(req.body);
      const template = await storage.createEmailTemplate(templateData);
      res.status(201).json(template);
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid input', errors: error.errors });
      }
      console.error('Error creating email template:', error);
      const errorMessage = error instanceof Error ? error.message : 'Server error';
      const errorDetails = error instanceof Error ? error.stack : 'No details available';
      res.status(500).json({ 
        message: 'Server error', 
        error: errorMessage,
        details: errorDetails
      });
    }
  });

  // Admin analytics
  app.get('/api/admin/stats', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      const stats = await storage.getJobStats();
      res.json(stats);
    } catch (error: unknown) {
      console.error('Error getting admin stats:', error);
      const errorMessage = error instanceof Error ? error.message : 'Server error';
      const errorDetails = error instanceof Error ? error.stack : 'No details available';
      res.status(500).json({ 
        message: 'Server error', 
        error: errorMessage,
        details: errorDetails
      });
    }
  });

  app.get('/api/admin/applications/:jobId', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      const applications = await storage.getApplicationsByJob(parseInt(req.params.jobId));
      const applicationsWithProfiles = await Promise.all(
        applications.map(async (app) => {
          const profile = await storage.getCandidateWithProfile(app.candidateId);
          return { ...app, candidate: profile };
        })
      );
      res.json(applicationsWithProfiles);
    } catch (error: unknown) {
      console.error('Error getting admin applications:', error);
      const errorMessage = error instanceof Error ? error.message : 'Server error';
      const errorDetails = error instanceof Error ? error.stack : 'No details available';
      res.status(500).json({ 
        message: 'Server error', 
        error: errorMessage,
        details: errorDetails
      });
    }
  });

  // Get candidate by ID (for admin email compose, etc.)
  app.get('/api/candidates/:id', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      const candidate = await storage.getCandidateById(parseInt(req.params.id));
      if (!candidate) {
        return res.status(404).json({ message: 'Candidate not found' });
      }
      const education = await storage.getCandidateEducation(candidate.id);
      const experience = await storage.getCandidateExperience(candidate.id);
      res.json({
        ...candidate,
        education,
        experience
      });
    } catch (error: unknown) {
      console.error('Error getting candidate:', error);
      const errorMessage = error instanceof Error ? error.message : 'Server error';
      const errorDetails = error instanceof Error ? error.stack : 'No details available';
      res.status(500).json({ 
        message: 'Server error', 
        error: errorMessage,
        details: errorDetails
      });
    }
  });

  // Candidate Notes (Admin only)
  app.get('/api/candidates/:id/notes', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      const candidateId = parseInt(req.params.id);
      const notes = await storage.getCandidateNotes(candidateId);
      res.json(notes);
    } catch (error: unknown) {
      console.error('Error getting candidate notes:', error);
      const errorMessage = error instanceof Error ? error.message : 'Server error';
      const errorDetails = error instanceof Error ? error.stack : 'No details available';
      res.status(500).json({ 
        message: 'Server error', 
        error: errorMessage,
        details: errorDetails
      });
    }
  });

  app.post('/api/candidates/:id/notes', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      const candidateId = parseInt(req.params.id);
      const adminId = req.user.id;
      const { note, score } = req.body;
      const noteData = { candidateId, adminId, note, score };
      const created = await storage.createCandidateNote(noteData);
      res.status(201).json(created);
    } catch (error: unknown) {
      console.error('Error creating candidate note:', error);
      const errorMessage = error instanceof Error ? error.message : 'Server error';
      const errorDetails = error instanceof Error ? error.stack : 'No details available';
      res.status(500).json({ 
        message: 'Server error', 
        error: errorMessage,
        details: errorDetails
      });
    }
  });

  app.put('/api/candidates/:id/notes/:noteId', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      const noteId = parseInt(req.params.noteId);
      const { note, score } = req.body;
      const updated = await storage.updateCandidateNote(noteId, { note, score });
      res.json(updated);
    } catch (error: unknown) {
      console.error('Error updating candidate note:', error);
      const errorMessage = error instanceof Error ? error.message : 'Server error';
      const errorDetails = error instanceof Error ? error.stack : 'No details available';
      res.status(500).json({ 
        message: 'Server error', 
        error: errorMessage,
        details: errorDetails
      });
    }
  });

  app.delete('/api/candidates/:id/notes/:noteId', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      const noteId = parseInt(req.params.noteId);
      await storage.deleteCandidateNote(noteId);
      res.status(204).send();
    } catch (error: unknown) {
      console.error('Error deleting candidate note:', error);
      const errorMessage = error instanceof Error ? error.message : 'Server error';
      const errorDetails = error instanceof Error ? error.stack : 'No details available';
      res.status(500).json({ 
        message: 'Server error', 
        error: errorMessage,
        details: errorDetails
      });
    }
  });

  // Candidate Reviews (Admin/Panel only)
  app.get('/api/applications/:id/reviews', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      const applicationId = parseInt(req.params.id);
      const stage = req.query.stage as string | undefined;
      const reviews = await storage.getCandidateReviews(applicationId, stage);
      res.json(reviews);
    } catch (error: unknown) {
      console.error('Error getting candidate reviews:', error);
      const errorMessage = error instanceof Error ? error.message : 'Server error';
      const errorDetails = error instanceof Error ? error.stack : 'No details available';
      res.status(500).json({ 
        message: 'Server error', 
        error: errorMessage,
        details: errorDetails
      });
    }
  });

  app.post('/api/applications/:id/reviews', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      const applicationId = parseInt(req.params.id);
      const reviewerId = req.user.id;
      const { candidateId, stage, rating, feedback } = req.body;
      const reviewData = { candidateId, applicationId, reviewerId, stage, rating, feedback };
      const created = await storage.createCandidateReview(reviewData);
      res.status(201).json(created);
    } catch (error: unknown) {
      console.error('Error creating candidate review:', error);
      const errorMessage = error instanceof Error ? error.message : 'Server error';
      const errorDetails = error instanceof Error ? error.stack : 'No details available';
      res.status(500).json({ 
        message: 'Server error', 
        error: errorMessage,
        details: errorDetails
      });
    }
  });

  app.put('/api/applications/:id/reviews/:reviewId', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      const reviewId = parseInt(req.params.reviewId);
      const { stage, rating, feedback } = req.body;
      const updated = await storage.updateCandidateReview(reviewId, { stage, rating, feedback });
      res.json(updated);
    } catch (error: unknown) {
      console.error('Error updating candidate review:', error);
      const errorMessage = error instanceof Error ? error.message : 'Server error';
      const errorDetails = error instanceof Error ? error.stack : 'No details available';
      res.status(500).json({ 
        message: 'Server error', 
        error: errorMessage,
        details: errorDetails
      });
    }
  });

  app.delete('/api/applications/:id/reviews/:reviewId', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      const reviewId = parseInt(req.params.reviewId);
      await storage.deleteCandidateReview(reviewId);
      res.status(204).send();
    } catch (error: unknown) {
      console.error('Error deleting candidate review:', error);
      const errorMessage = error instanceof Error ? error.message : 'Server error';
      const errorDetails = error instanceof Error ? error.stack : 'No details available';
      res.status(500).json({ 
        message: 'Server error', 
        error: errorMessage,
        details: errorDetails
      });
    }
  });

  // --- Assessment Categories ---
  app.get('/api/assessment-categories', authenticateToken, async (req: any, res) => {
    try {
      const categories = await storage.getAssessmentCategories();
      res.json(categories);
    } catch (error: unknown) {
      console.error('Error getting assessment categories:', error);
      const errorMessage = error instanceof Error ? error.message : 'Server error';
      const errorDetails = error instanceof Error ? error.stack : 'No details available';
      res.status(500).json({ 
        message: 'Server error', 
        error: errorMessage,
        details: errorDetails
      });
    }
  });
  app.post('/api/assessment-categories', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      const category = await storage.createAssessmentCategory(req.body);
      res.status(201).json(category);
    } catch (error: unknown) {
      console.error('Error creating assessment category:', error);
      const errorMessage = error instanceof Error ? error.message : 'Server error';
      const errorDetails = error instanceof Error ? error.stack : 'No details available';
      res.status(500).json({ 
        message: 'Server error', 
        error: errorMessage,
        details: errorDetails
      });
    }
  });

  // --- Assessment Templates ---
  app.get('/api/assessment-templates', authenticateToken, async (req: any, res) => {
    try {
      const templates = await storage.getAssessmentTemplates();
      res.json(templates);
    } catch (error: unknown) {
      console.error('Error getting assessment templates:', error);
      const errorMessage = error instanceof Error ? error.message : 'Server error';
      const errorDetails = error instanceof Error ? error.stack : 'No details available';
      res.status(500).json({ 
        message: 'Server error', 
        error: errorMessage,
        details: errorDetails
      });
    }
  });

  app.get('/api/assessment-templates/:id', authenticateToken, async (req: any, res) => {
    try {
      const templateId = parseInt(req.params.id);
      console.log('Fetching assessment template with ID:', templateId);
      
      const template = await storage.getAssessmentTemplate(templateId);
      console.log('Template data:', template);
      
      if (!template) {
        console.log('Template not found for ID:', templateId);
        return res.status(404).json({ message: 'Assessment template not found' });
      }
      
      const questions = await storage.getAssessmentQuestions(templateId);
      console.log('Questions found:', questions.length);
      
      res.json({ 
        ...template, 
        questions,
        success: true 
      });
    } catch (error: unknown) {
      console.error('Error getting assessment template:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      res.status(500).json({ 
        message: 'Failed to get assessment template',
        error: errorMessage,
        stack: errorStack
      });
    }
  });
  app.post('/api/assessment-templates', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      const template = await storage.createAssessmentTemplate(req.body);
      res.status(201).json(template);
    } catch (error: unknown) {
      console.error('Error creating assessment template:', error);
      const errorMessage = error instanceof Error ? error.message : 'Server error';
      const errorDetails = error instanceof Error ? error.stack : 'No details available';
      res.status(500).json({ 
        message: 'Server error', 
        error: errorMessage,
        details: errorDetails
      });
    }
  });
  app.put('/api/assessment-templates/:id', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      const template = await storage.updateAssessmentTemplate(parseInt(req.params.id), req.body);
      res.json(template);
    } catch (error: unknown) {
      console.error('Error updating assessment template:', error);
      const errorMessage = error instanceof Error ? error.message : 'Server error';
      const errorDetails = error instanceof Error ? error.stack : 'No details available';
      res.status(500).json({ 
        message: 'Server error', 
        error: errorMessage,
        details: errorDetails
      });
    }
  });
  app.delete('/api/assessment-templates/:id', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      await storage.deleteAssessmentTemplate(parseInt(req.params.id));
      res.status(204).send();
    } catch (error: unknown) {
      console.error('Error deleting assessment template:', error);
      const errorMessage = error instanceof Error ? error.message : 'Server error';
      const errorDetails = error instanceof Error ? error.stack : 'No details available';
      res.status(500).json({ 
        message: 'Server error', 
        error: errorMessage,
        details: errorDetails
      });
    }
  });

  // --- Candidate Pending Assessments ---
  app.get('/api/candidate/pending-assessments', authenticateToken, async (req: any, res) => {
    try {
      const candidateId = req.user.id;
      if (!candidateId) {
        return res.status(400).json({ message: 'Candidate ID is required' });
      }

      // Get all applications for the candidate
      const applications = await storage.getApplicationsByCandidate(candidateId);
      
      // Get unique job IDs from applications
      const jobIds = [...new Set(applications.map((app: any) => app.jobId))];
      
      // Get all job assessments for these jobs
      const allAssessments = [];
      console.log('Job IDs to fetch assessments for:', jobIds);
      
      for (const jobId of jobIds) {
        try {
          console.log(`Fetching assessments for job ${jobId}`);
          const jobAssessments = await storage.getJobAssessments(jobId);
          console.log(`Found ${jobAssessments.length} assessments for job ${jobId}`);
          
          for (const assessment of jobAssessments) {
            try {
              console.log(`Processing assessment ${assessment.id} for template ${assessment.templateId}`);
              // Check if there's already an attempt for this assessment
              const existingAttempt = await storage.findAssessmentAttempt(
                candidateId,
                assessment.templateId,
                jobId
              );
              
              console.log(`Existing attempt for template ${assessment.templateId}:`, existingAttempt);
              
              // Only include assessments that don't have a completed attempt
              if (!existingAttempt || existingAttempt.status === 'in_progress') {
                console.log(`Fetching template for assessment ${assessment.id}`);
                const template = await storage.getAssessmentTemplate(assessment.templateId);
                console.log(`Template data for ${assessment.templateId}:`, template);
                
                if (template) {
                  const assessmentData = {
                    ...assessment,
                    template,
                    jobId,
                    attemptId: existingAttempt?.id,
                    status: existingAttempt?.status || 'not_started'
                  };
                  console.log('Adding assessment:', assessmentData);
                  allAssessments.push(assessmentData);
                }
              }
            } catch (innerError) {
              console.error(`Error processing assessment ${assessment.id}:`, innerError);
            }
          }
        } catch (jobError) {
          console.error(`Error fetching assessments for job ${jobId}:`, jobError);
        }
      }
      
      res.json(allAssessments);
    } catch (error: unknown) {
      console.error('Error getting pending assessments:', error);
      const errorMessage = error instanceof Error ? error.message : 'Server error';
      res.status(500).json({ message: 'Failed to get pending assessments', error: errorMessage });
    }
  });

  // --- Job Assessments ---
  app.get('/api/job-assessments/:jobId', authenticateToken, async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      if (isNaN(jobId)) {
        return res.status(400).json({ message: 'Invalid job ID' });
      }
      
      // Get job assessments with template details
      const jobAssessments = await storage.getJobAssessments(jobId);
      
      // Fetch template details for each job assessment
      const assessmentsWithTemplates = await Promise.all(
        jobAssessments.map(async (jobAssessment: any) => {
          const template = await storage.getAssessmentTemplate(jobAssessment.templateId);
          return {
            ...jobAssessment,
            template: template || null
          };
        })
      );
      
      res.json(assessmentsWithTemplates);
    } catch (error: unknown) {
      console.error('Error getting job assessments:', error);
      const errorMessage = error instanceof Error ? error.message : 'Server error';
      res.status(500).json({ message: 'Failed to get job assessments', error: errorMessage });
    }
  });

  // --- Assessment Questions ---
  app.get('/api/assessment-templates/:id/questions', authenticateToken, async (req: any, res) => {
    try {
      const questions = await storage.getAssessmentQuestions(parseInt(req.params.id));
      res.json(questions);
    } catch (error: unknown) {
      console.error('Error getting assessment questions:', error);
      const errorMessage = error instanceof Error ? error.message : 'Server error';
      const errorDetails = error instanceof Error ? error.stack : 'No details available';
      res.status(500).json({ 
        message: 'Server error', 
        error: errorMessage,
      });
    }
  });

  // --- Assessment Routes ---
  
  // Start an assessment
  app.post('/api/assessments/start/:templateId', authenticateToken, requireRole('candidate'), async (req: any, res) => {
    try {
      const templateId = parseInt(req.params.templateId);
      const jobId = req.body.jobId ? parseInt(req.body.jobId) : undefined;
      
      if (isNaN(templateId)) {
        return res.status(400).json({ 
          success: false,
          message: 'Invalid template ID' 
        });
      }

      const candidate = await storage.getCandidate(req.user.id);
      if (!candidate) {
        return res.status(404).json({ 
          success: false,
          message: 'Candidate not found' 
        });
      }

      // Check if candidate already has an in-progress or completed attempt
      // For job-specific assessments, use jobId, otherwise use 0 for general assessments
      const searchJobId = jobId || 0;
      const existingAttempt = await storage.findAssessmentAttempt(
        candidate.id, 
        templateId, 
        searchJobId
      );
      
      if (existingAttempt) {
        if (existingAttempt.status === 'completed') {
          return res.status(400).json({
            success: false,
            message: 'You have already completed this assessment',
            attemptId: existingAttempt.id,
            status: 'completed',
            templateId
          });
        }
        
        // Return existing in-progress attempt
        return res.json({
          success: true,
          attemptId: existingAttempt.id,
          status: existingAttempt.status,
          message: 'Resuming existing assessment',
          templateId
        });
      }

      // Start a new assessment
      const result = await storage.startAssessment(templateId, candidate.id, jobId);

      if (!result.attemptId) {
        throw new Error('Failed to create assessment attempt');
      }

      return res.json({
        success: true,
        attemptId: result.attemptId,
        status: result.status,
        message: 'Assessment started successfully',
        templateId
      });
    } catch (error: unknown) {
      console.error('Error starting assessment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to start assessment';
      return res.status(500).json({ 
        success: false, 
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
      });
    }
  });
  
  // Get pending assessments for a candidate
  app.get('/api/candidate/pending-assessments', authenticateToken, async (req: any, res) => {
    try {
      const candidateId = req.user.id;
      if (!candidateId) {
        return res.status(400).json({ 
          success: false,
          message: 'Candidate ID is required' 
        });
      }

      const assessments = await storage.getPendingAssessments(candidateId);
      return res.json({
        success: true,
        data: assessments
      });
    } catch (error: unknown) {
      console.error('Error fetching pending assessments:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch pending assessments';
      return res.status(500).json({ 
        success: false, 
        message: errorMessage
      });
    }
  });
  app.post('/api/assessment-templates/:id/questions', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      const question = await storage.createAssessmentQuestion(parseInt(req.params.id), req.body);
      res.status(201).json(question);
    } catch (error: unknown) {
      console.error('Error creating assessment question:', error);
      const errorMessage = error instanceof Error ? error.message : 'Server error';
      const errorDetails = error instanceof Error ? error.stack : 'No details available';
      res.status(500).json({ 
        message: 'Server error', 
        error: errorMessage,
        details: errorDetails
      });
    }
  });
  app.put('/api/assessment-questions/:id', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      const question = await storage.updateAssessmentQuestion(parseInt(req.params.id), req.body);
      res.json(question);
    } catch (error: unknown) {
      console.error('Error updating assessment question:', error);
      const errorMessage = error instanceof Error ? error.message : 'Server error';
      const errorDetails = error instanceof Error ? error.stack : 'No details available';
      res.status(500).json({ 
        message: 'Server error', 
        error: errorMessage,
        details: errorDetails
      });
    }
  });
  app.delete('/api/assessment-questions/:id', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      await storage.deleteAssessmentQuestion(parseInt(req.params.id));
      res.status(204).send();
    } catch (error: unknown) {
      console.error('Error deleting assessment question:', error);
      const errorMessage = error instanceof Error ? error.message : 'Server error';
      const errorDetails = error instanceof Error ? error.stack : 'No details available';
      res.status(500).json({ 
        message: 'Server error', 
        error: errorMessage,
        details: errorDetails
      });
    }
  });

  // --- Job Assessments ---
  app.get('/api/jobs/:id/assessments', authenticateToken, async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const assessments = await storage.getAssessmentsByJob(jobId);
      res.json(assessments);
    } catch (error: unknown) {
      console.error('Error getting job assessments:', error);
      const errorMessage = error instanceof Error ? error.message : 'Server error';
      const errorDetails = error instanceof Error ? error.stack : 'No details available';
      res.status(500).json({ 
        message: 'Server error', 
        error: errorMessage,
        details: errorDetails
      });
    }
  });
  app.post('/api/jobs/:id/assessments', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      const assessment = await storage.createJobAssessment(parseInt(req.params.id), req.body);
      res.status(201).json(assessment);
    } catch (error: unknown) {
      console.error('Error creating job assessment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Server error';
      const errorDetails = error instanceof Error ? error.stack : 'No details available';
      res.status(500).json({ 
        message: 'Server error', 
        error: errorMessage,
        details: errorDetails
      });
    }
  });
  app.delete('/api/jobs/:id/assessments/:assessmentId', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      await storage.deleteJobAssessment(parseInt(req.params.assessmentId));
      res.status(204).send();
    } catch (error: unknown) {
      console.error('Error deleting job assessment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Server error';
      const errorDetails = error instanceof Error ? error.stack : 'No details available';
      res.status(500).json({ 
        message: 'Server error', 
        error: errorMessage,
        details: errorDetails
      });
    }
  });

  // --- Candidate Flow ---
  app.get('/api/candidate/assessments/pending', authenticateToken, requireRole('candidate'), async (req: any, res) => {
    try {
      const pending = await storage.getPendingAssessments(req.user.id);
      res.json(pending);
    } catch (error: unknown) {
      console.error('Error getting pending assessments:', error);
      const errorMessage = error instanceof Error ? error.message : 'Server error';
      const errorDetails = error instanceof Error ? error.stack : 'No details available';
      res.status(500).json({ 
        message: 'Server error', 
        error: errorMessage,
        details: errorDetails
      });
    }
  });
  app.get('/api/assessments/:templateId/start', authenticateToken, requireRole('candidate'), async (req: any, res) => {
    try {
      const templateId = parseInt(req.params.templateId);
      const jobId = req.query.jobId ? parseInt(req.query.jobId as string) : undefined;
      let attempt = await storage.findAssessmentAttempt(req.user.id, templateId, jobId);
      if (!attempt) {
        const result = await storage.startAssessment(templateId, req.user.id, jobId);
        return res.json({ attemptId: result.attemptId, status: result.status });
      }
      res.json({ attemptId: attempt.id, status: attempt.status });
    } catch (error: unknown) {
      console.error('Error starting assessment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Server error';
      const errorDetails = error instanceof Error ? error.stack : 'No details available';
      res.status(500).json({ 
        message: 'Server error', 
        error: errorMessage,
        details: errorDetails
      });
    }
  });
  app.post('/api/assessments/:attemptId/submit', authenticateToken, requireRole('candidate'), async (req: any, res) => {
    try {
      const result = await storage.submitAssessment(parseInt(req.params.attemptId), req.body);
      res.json(result);
    } catch (error: unknown) {
      console.error('Error submitting assessment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Server error';
      const errorDetails = error instanceof Error ? error.stack : 'No details available';
      res.status(500).json({ 
        message: 'Server error', 
        error: errorMessage,
        details: errorDetails
      });
    }
  });
  app.get('/api/assessments/:attemptId/results', authenticateToken, async (req: any, res) => {
    try {
      const result = await storage.getAssessmentResults(parseInt(req.params.attemptId));
      res.json(result);
    } catch (error: unknown) {
      console.error('Error getting assessment results:', error);
      const errorMessage = error instanceof Error ? error.message : 'Server error';
      const errorDetails = error instanceof Error ? error.stack : 'No details available';
      res.status(500).json({ 
        message: 'Server error', 
        error: errorMessage,
        details: errorDetails
      });
    }
  });

  // Add endpoint to fetch assessment questions
  app.get('/api/assessments/:templateId/questions', authenticateToken, async (req: any, res) => {
    try {
      const templateId = parseInt(req.params.templateId);
      const template = await storage.getAssessmentTemplate(templateId);
      if (!template) {
        return res.status(404).json({ message: 'Assessment template not found' });
      }
      
      const questions = await storage.getAssessmentQuestions(templateId);
      res.json({
        questions,
        durationMinutes: template.durationMinutes
      });
    } catch (error: unknown) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // --- Admin View ---
  app.get('/api/admin/assessments/results', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      const results = await storage.getAllAssessmentResults();
      res.json(results);
    } catch (error: unknown) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  app.get('/api/admin/candidates/:candidateId/assessments', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      const results = await storage.getCandidateAssessments(parseInt(req.params.candidateId));
      res.json(results);
    } catch (error: unknown) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // --- Assessment Analytics ---
  app.get('/api/admin/assessment-analytics', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      const analytics = await storage.getAssessmentAnalytics();
      res.json(analytics);
    } catch (error: unknown) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // --- Resume Search ---
  app.get('/api/search/resumes', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      const { q = '', skills, experience, education, location, status, page = 1, limit = 20 } = req.query;
      
      const filters: SearchFilters = {
        skills: skills ? (Array.isArray(skills) ? skills : [skills]) : undefined,
        experience: experience ? (Array.isArray(experience) ? experience : [experience]) : undefined,
        education: education ? (Array.isArray(education) ? education : [education]) : undefined,
        location: location ? (Array.isArray(location) ? location : [location]) : undefined,
        status: status ? (Array.isArray(status) ? status : [status]) : undefined,
      };

      const results = await storage.searchResumes(q, filters, parseInt(page), parseInt(limit));
      
      // Save search query for history
      await storage.saveSearchQuery(q, filters, results.total, req.user.id);
      
      res.json(results);
    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({ message: 'Search failed' });
    }
  });

  app.get('/api/search/suggestions', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      const { q = '' } = req.query;
      const suggestions = await storage.getSearchSuggestions(q);
      res.json(suggestions);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get suggestions' });
    }
  });

  app.get('/api/search/history', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      const history = await storage.getSearchHistory(req.user.id);
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get search history' });
    }
  });

  // Candidate search endpoint
  app.post('/api/candidate-search', authenticateToken, async (req, res) => {
    try {
      const { keyword, filters, page = 1, limit = 20 } = req.body;
      // filters: { firstName, lastName, city, province, cnic, motivationLetter, skills, experience, education }
      const results = await storage.searchResumes(keyword, filters || {}, page, limit);
      res.json(results);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Serve uploaded files
  app.use('/uploads', (await import('express')).static('uploads'));

  // Analytics Dashboard Endpoints
  app.get('/api/dashboard/kpis', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      const { startDate, endDate, department } = req.query;
      const start = typeof startDate === 'string' ? startDate : undefined;
      const end = typeof endDate === 'string' ? endDate : undefined;
      const dept = typeof department === 'string' ? department : undefined;
      let jobs = await storage.getJobs();
      if (dept) {
        jobs = jobs.filter((j: any) => j.department === dept);
      }
      const jobIds = jobs.map((j: any) => j.id);
      const hiredRows = await db.select().from(applications).where(eq(applications.status, 'hired'));
      const filteredHiredRows = hiredRows.filter((app: any) => jobIds.includes(app.jobId) &&
        (!start || new Date(app.hiredAt) >= new Date(start)) &&
        (!end || new Date(app.hiredAt) <= new Date(end)));
      let avgTimeToHire = null;
      if (filteredHiredRows.length > 0) {
        const totalDays = filteredHiredRows.reduce((sum, app) => {
          if (app.hiredAt && app.appliedAt) {
            const diff = (new Date(app.hiredAt).getTime() - new Date(app.appliedAt).getTime()) / (1000 * 60 * 60 * 24);
            return sum + diff;
          }
          return sum;
        }, 0);
        avgTimeToHire = totalDays / filteredHiredRows.length;
      }
      const offersRows = await db.select().from(offers);
      const filteredOffersRows = offersRows.filter((o: any) => jobIds.includes(o.jobId) &&
        (!start || new Date(o.offeredAt) >= new Date(start)) &&
        (!end || new Date(o.offeredAt) <= new Date(end)));
      let offerAcceptanceRate = null;
      if (filteredOffersRows.length > 0) {
        const accepted = filteredOffersRows.filter((o: any) => o.accepted).length;
        offerAcceptanceRate = (accepted / filteredOffersRows.length) * 100;
      }
      const jobCostsRows = await db.select().from(jobCosts);
      const filteredJobCostsRows = jobCostsRows.filter((jc: any) => jobIds.includes(jc.jobId) &&
        (!start || new Date(jc.incurredAt) >= new Date(start)) &&
        (!end || new Date(jc.incurredAt) <= new Date(end)));
      let costPerHire = null;
      if (filteredHiredRows.length > 0 && filteredJobCostsRows.length > 0) {
        const totalCost = filteredJobCostsRows.reduce((sum, jc) => sum + (jc.cost || 0), 0);
        costPerHire = totalCost / filteredHiredRows.length;
      }
      res.json({ totalJobs: jobs.length, totalHires: filteredHiredRows.length, avgTimeToHire, offerAcceptanceRate, costPerHire });
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch KPIs', error: error?.message });
    }
  });

  app.get('/api/dashboard/visuals/time-to-hire', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      const { startDate, endDate, department } = req.query;
      const start = typeof startDate === 'string' ? startDate : undefined;
      const end = typeof endDate === 'string' ? endDate : undefined;
      const dept = typeof department === 'string' ? department : undefined;
      let jobs = await storage.getJobs();
      if (dept) {
        jobs = jobs.filter((j: any) => j.department === dept);
      }
      const jobIds = jobs.map((j: any) => j.id);
      const hiredApps = await db.select().from(applications).where(eq(applications.status, 'hired'));
      const filteredApps = hiredApps.filter((app: any) => jobIds.includes(app.jobId) &&
        (!start || new Date(app.hiredAt) >= new Date(start)) &&
        (!end || new Date(app.hiredAt) <= new Date(end)));
      const trend: Record<string, number[]> = {};
      for (const app of filteredApps) {
        if (app.jobId && app.hiredAt && app.appliedAt) {
          const diff = (new Date(app.hiredAt).getTime() - new Date(app.appliedAt).getTime()) / (1000 * 60 * 60 * 24);
          if (!trend[app.jobId]) trend[app.jobId] = [];
          trend[app.jobId].push(diff);
        }
      }
      const result = Object.entries(trend).map(([jobId, arr]) => ({
        jobId,
        avgTimeToHire: arr.reduce((a, b) => a + b, 0) / arr.length
      }));
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch time-to-hire trend', error: error?.message });
    }
  });

  app.get('/api/dashboard/visuals/source-of-hire', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      const { startDate, endDate, department } = req.query;
      const start = typeof startDate === 'string' ? startDate : undefined;
      const end = typeof endDate === 'string' ? endDate : undefined;
      const dept = typeof department === 'string' ? department : undefined;
      let jobs = await storage.getJobs();
      if (dept) {
        jobs = jobs.filter((j: any) => j.department === dept);
      }
      const jobIds = jobs.map((j: any) => j.id);
      const hiredApps = await db.select().from(applications).where(eq(applications.status, 'hired'));
      const filteredApps = hiredApps.filter((app: any) => jobIds.includes(app.jobId) &&
        (!start || new Date(app.hiredAt) >= new Date(start)) &&
        (!end || new Date(app.hiredAt) <= new Date(end)));
      const sourceDist: Record<string, number> = {};
      for (const app of filteredApps) {
        if (app.source) {
          sourceDist[app.source] = (sourceDist[app.source] || 0) + 1;
        }
      }
      res.json(sourceDist);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch source-of-hire', error: error?.message });
    }
  });

  app.get('/api/dashboard/visuals/offer-acceptance', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      const { startDate, endDate, department } = req.query;
      const start = typeof startDate === 'string' ? startDate : undefined;
      const end = typeof endDate === 'string' ? endDate : undefined;
      const dept = typeof department === 'string' ? department : undefined;
      let jobs = await storage.getJobs();
      if (dept) {
        jobs = jobs.filter((j: any) => j.department === dept);
      }
      const jobIds = jobs.map((j: any) => j.id);
      const allOffers = await db.select().from(offers);
      const filteredOffers = allOffers.filter((offer: any) => jobIds.includes(offer.jobId) &&
        (!start || new Date(offer.offeredAt) >= new Date(start)) &&
        (!end || new Date(offer.offeredAt) <= new Date(end)));
      const byJob: Record<string, { total: number, accepted: number }> = {};
      for (const offer of filteredOffers) {
        if (!byJob[offer.jobId]) byJob[offer.jobId] = { total: 0, accepted: 0 };
        byJob[offer.jobId].total++;
        if (offer.accepted) byJob[offer.jobId].accepted++;
      }
      const result = Object.entries(byJob).map(([jobId, { total, accepted }]) => ({
        jobId,
        acceptanceRate: total > 0 ? (accepted / total) * 100 : null
      }));
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch offer acceptance rates', error: error?.message });
    }
  });

  // --- Job Cost Management ---
  app.get('/api/job-costs', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      const jobId = parseInt(req.query.jobId);
      if (isNaN(jobId)) {
        return res.status(400).json({ message: 'Missing or invalid jobId' });
      }
      const costs = await storage.getJobCostsByJob(jobId);
      res.json(costs);
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error?.message });
    }
  });

  app.post('/api/job-costs', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      const costData = req.body;
      // Validate input (jobId, cost, description)
      if (!costData.jobId || typeof costData.cost !== 'number') {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      const created = await storage.createJobCost(costData);
      res.status(201).json(created);
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error?.message });
    }
  });

  app.put('/api/job-costs/:id', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid cost id' });
      }
      const updated = await storage.updateJobCost(id, req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error?.message });
    }
  });

  // Health check endpoint
  app.get('/api/health', async (req, res) => {
    try {
      const redisHealth = await redisService.healthCheck();
      
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          database: 'connected',
          redis: redisHealth ? 'connected' : 'disconnected (fallback mode)'
        }
      });
    } catch (error) {
      res.status(500).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed'
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
