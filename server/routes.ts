import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import { insertUserSchema, insertCandidateSchema, insertEducationSchema, insertExperienceSchema, insertJobSchema, insertJobTemplateSchema, insertApplicationSchema, insertEmailTemplateSchema, insertSkillSchema, insertProjectSchema, type SearchFilters, candidates } from "@shared/schema";
import { z } from "zod";
import { spawn } from "child_process";
import { eq, sql, or } from "drizzle-orm";
import { db } from "./db";
import { applications, offers, jobCosts, users } from "@shared/schema";
import crypto from "crypto";
import { redisService } from "./redis";
import { secretManager } from "./secrets";
import { skillRequestSchema } from "@shared/schema";

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
  // Helper function to get Python command
  const getPythonCommand = () => {
    return process.platform === 'win32' ? 'python' : 'python3';
  };

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
        return res.status(400).json({ 
          message: 'Email and password are required',
          details: 'Both email and password fields must be provided'
        });
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        console.log('❌ Error: Invalid email format:', email);
        return res.status(400).json({ 
          message: 'Invalid email format',
          details: 'Please provide a valid email address'
        });
      }
      
      console.log('🔑 Login attempt for email:', email);
      
      // Test database connection first
      try {
        console.log('🔍 Testing database connection...');
        await db.execute(sql`SELECT 1`);
        console.log('✅ Database connection successful');
      } catch (dbError: any) {
        console.error('❌ Database connection failed:', dbError);
        return res.status(500).json({ 
          message: 'Database connection error',
          details: 'Unable to connect to the database. Please try again later.',
          error: dbError.message
        });
      }
      
      // Log database query
      console.log('🔍 Querying database for user...');
      let user;
      try {
        user = await storage.getUserByEmail(email);
      console.log('✅ Database query completed');
      } catch (queryError: any) {
        console.error('❌ Database query failed:', queryError);
        return res.status(500).json({ 
          message: 'Database query error',
          details: 'Failed to retrieve user information from database.',
          error: queryError.message
        });
      }
      
      if (!user) {
        console.log('❌ No user found with email:', email);
        return res.status(401).json({ 
          message: 'Invalid credentials',
          details: 'No user found with the provided email address'
        });
      }

      console.log('👤 User found in database:', {
        id: user.id,
        email: user.email,
        role: user.role,
        passwordHash: user.password ? '***HASHED***' : 'NO_PASSWORD'
      });
      
      // Check if user has a password hash
      if (!user.password) {
        console.log('❌ User has no password hash:', email);
        return res.status(500).json({ 
          message: 'Account configuration error',
          details: 'User account is not properly configured. Please contact support.'
        });
      }
      
      // Log password comparison
      console.log('🔑 Comparing provided password...');
      let validPassword;
      try {
        validPassword = await bcrypt.compare(password, user.password);
      console.log('🔑 Password comparison result:', validPassword);
      } catch (bcryptError: any) {
        console.error('❌ Password comparison failed:', bcryptError);
        return res.status(500).json({ 
          message: 'Password verification error',
          details: 'Failed to verify password. Please try again.',
          error: bcryptError.message
        });
      }
      
      if (!validPassword) {
        console.log('❌ Invalid password for user:', email);
        console.log('Provided password length:', password.length);
        console.log('Stored hash length:', user.password.length);
        return res.status(401).json({ 
          message: 'Invalid credentials',
          details: 'The password you entered is incorrect'
        });
      }

      console.log('✅ Password verification successful');
      
      // Generate JWT token
      let token;
      try {
        token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
        console.log('✅ JWT token generated successfully');
      } catch (jwtError: any) {
        console.error('❌ JWT token generation failed:', jwtError);
        return res.status(500).json({ 
          message: 'Token generation error',
          details: 'Failed to generate authentication token. Please try again.',
          error: jwtError.message
        });
      }

      // Generate CSRF token
      let csrfToken;
      try {
        csrfToken = crypto.randomBytes(32).toString('hex');
        console.log('✅ CSRF token generated successfully');
      } catch (cryptoError: any) {
        console.error('❌ CSRF token generation failed:', cryptoError);
        return res.status(500).json({ 
          message: 'Security token error',
          details: 'Failed to generate security token. Please try again.',
          error: cryptoError.message
        });
      }

      // Set httpOnly cookie with JWT token
      try {
      res.cookie('jwt_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        path: '/'
      });
        console.log('✅ JWT cookie set successfully');
      } catch (cookieError: any) {
        console.error('❌ Failed to set JWT cookie:', cookieError);
        return res.status(500).json({ 
          message: 'Cookie setting error',
          details: 'Failed to set authentication cookie. Please try again.',
          error: cookieError.message
        });
      }

      // Set CSRF token as httpOnly cookie
      try {
      res.cookie('csrf_token', csrfToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        path: '/'
      });
        console.log('✅ CSRF cookie set successfully');
      } catch (cookieError: any) {
        console.error('❌ Failed to set CSRF cookie:', cookieError);
        return res.status(500).json({ 
          message: 'Cookie setting error',
          details: 'Failed to set security cookie. Please try again.',
          error: cookieError.message
        });
      }

      console.log('🎉 Login successful for user:', email);

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
      console.error('❌ Login error:', error);
      console.error('Error stack:', error.stack);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      
      // Determine error type and provide appropriate response
      let statusCode = 500;
      let errorMessage = 'Server error';
      let errorDetails = 'An unexpected error occurred during login';
      
      if (error.name === 'ValidationError') {
        statusCode = 400;
        errorMessage = 'Validation error';
        errorDetails = error.message;
      } else if (error.name === 'DatabaseError' || error.message.includes('database')) {
        statusCode = 500;
        errorMessage = 'Database error';
        errorDetails = 'A database error occurred. Please try again later.';
      } else if (error.name === 'JWTError' || error.message.includes('jwt')) {
        statusCode = 500;
        errorMessage = 'Token error';
        errorDetails = 'Failed to generate authentication token.';
      } else if (error.name === 'CryptoError' || error.message.includes('crypto')) {
        statusCode = 500;
        errorMessage = 'Security error';
        errorDetails = 'Failed to generate security tokens.';
      }
      
      res.status(statusCode).json({ 
        message: errorMessage, 
        details: errorDetails,
        error: error.message 
      });
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
      const { email, password } = req.body;
      
      // Validate user data
      const userData = insertUserSchema.parse({ email, password });
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        console.log('Registration failed: User already exists', { email: userData.email });
        return res.status(400).json({ message: 'User with this email already exists' });
      }

      // Check CNIC validation and uniqueness
      const cnic = req.body.cnic;
      if (!cnic) {
        console.log('Registration failed: CNIC is required');
        return res.status(400).json({ message: 'CNIC is required' });
      }
      
      // Validate CNIC format (exactly 13 digits)
      if (!/^\d{13}$/.test(cnic)) {
        console.log('Registration failed: CNIC must be exactly 13 digits', { cnic });
        return res.status(400).json({ message: 'CNIC must be exactly 13 digits' });
      }
      
      const existingCnic = await storage.getCandidateByCnic(cnic);
      if (existingCnic) {
        console.log('Registration failed: CNIC already exists', { cnic });
        return res.status(400).json({ message: 'CNIC already registered' });
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
      const projects = await storage.getCandidateProjects(candidate.id);

      console.log('🔍 [PROFILE GET] Raw projects from database:', JSON.stringify(projects, null, 2));

      // Process projects description field (convert from JSON to array)
      const processedProjects = projects.map(project => ({
        ...project,
        description: project.description && typeof project.description === 'string' 
          ? (() => {
              try {
                return JSON.parse(project.description);
              } catch (e) {
                return [project.description];
              }
            })()
          : (Array.isArray(project.description) ? project.description : [""])
      }));

      console.log('🔍 [PROFILE GET] Processed projects:', JSON.stringify(processedProjects, null, 2));

      // Map social links directly for frontend
      const responseCandidate = {
        ...candidate,
        linkedin: (candidate as any).linkedin ?? (candidate as any).linkedin_url,
        github: (candidate as any).github ?? (candidate as any).github_url,
        education,
        experience,
        projects: processedProjects
      };

      console.log('🔍 [PROFILE GET] Raw candidate data:', JSON.stringify(candidate, null, 2));
      console.log('🔍 [PROFILE GET] Mapped response data:', JSON.stringify(responseCandidate, null, 2));
      console.log('🔍 [PROFILE GET] Social links - linkedin:', (responseCandidate as any).linkedin, 'github:', (responseCandidate as any).github);
      console.log('🔍 [PROFILE GET] Final response includes projects:', responseCandidate.projects ? 'YES' : 'NO', 'Projects count:', responseCandidate.projects?.length || 0);

      res.json(responseCandidate);
    } catch (error: unknown) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.put('/api/profile', authenticateToken, async (req: any, res) => {
    try {
      console.log('🔍 [PROFILE UPDATE] Starting profile update for user:', req.user.id);
      console.log('📥 [PROFILE UPDATE] Raw request body:', JSON.stringify(req.body, null, 2));
      
      const candidate = await storage.getCandidate(req.user.id);
      if (!candidate) {
        console.log('❌ [PROFILE UPDATE] Profile not found for user:', req.user.id);
        return res.status(404).json({ message: 'Profile not found' });
      }

      console.log('✅ [PROFILE UPDATE] Found existing candidate:', {
        id: candidate.id,
        currentUpdatedAt: candidate.updatedAt,
        type: typeof candidate.updatedAt
      });

      // Clean the request body to remove any problematic fields
      const cleanedBody = { ...req.body };
      
      // Remove updatedAt if it's being sent as a string
      if (cleanedBody.updatedAt) {
        console.log('⚠️ [PROFILE UPDATE] Removing updatedAt from request body:', {
          value: cleanedBody.updatedAt,
          type: typeof cleanedBody.updatedAt
        });
        delete cleanedBody.updatedAt;
      }
      
      // Remove createdAt if it's being sent
      if (cleanedBody.createdAt) {
        console.log('⚠️ [PROFILE UPDATE] Removing createdAt from request body');
        delete cleanedBody.createdAt;
      }
      
      // Remove id if it's being sent
      if (cleanedBody.id) {
        console.log('⚠️ [PROFILE UPDATE] Removing id from request body');
        delete cleanedBody.id;
      }

      console.log('🧹 [PROFILE UPDATE] Cleaned request body:', JSON.stringify(cleanedBody, null, 2));
      console.log('🔍 [PROFILE UPDATE] Social links in request - linkedin:', cleanedBody.linkedin, 'github:', cleanedBody.github);

      // Validate the data with schema (includes social links)
      console.log('🔍 [PROFILE UPDATE] About to validate with schema. Input data keys:', Object.keys(cleanedBody));
      console.log('🔍 [PROFILE UPDATE] Input data for validation:', JSON.stringify(cleanedBody, null, 2));
      
      let validatedData: any;
      try {
        validatedData = insertCandidateSchema.partial().parse(cleanedBody);
        console.log('✅ [PROFILE UPDATE] Schema validation passed:', JSON.stringify(validatedData, null, 2));
        console.log('🔍 [PROFILE UPDATE] Validated data keys:', Object.keys(validatedData));
      } catch (error) {
        console.error('❌ [PROFILE UPDATE] Schema validation failed:', error);
        if (error instanceof Error) {
          console.error('❌ [PROFILE UPDATE] Error message:', error.message);
        }
        throw error;
      }

      // Normalize social links and handle empty strings
      const profileData = { ...validatedData } as any;
      console.log('🔍 [PROFILE UPDATE] Before normalization - linkedin:', profileData.linkedin, 'github:', profileData.github);
      profileData.linkedin = (typeof profileData.linkedin === 'string' && profileData.linkedin.trim() !== '')
        ? profileData.linkedin.trim()
        : null;
      profileData.github = (typeof profileData.github === 'string' && profileData.github.trim() !== '')
        ? profileData.github.trim()
        : null;
      
      console.log('🔍 [PROFILE UPDATE] Final data for database:', JSON.stringify(profileData, null, 2));
      // If CNIC is being updated, validate format and check uniqueness
      if (profileData.cnic && profileData.cnic !== candidate.cnic) {
        console.log('🔍 [PROFILE UPDATE] Checking CNIC format and uniqueness:', profileData.cnic);
        
        // Validate CNIC format (exactly 13 digits)
        if (!/^\d{13}$/.test(profileData.cnic)) {
          console.log('❌ [PROFILE UPDATE] CNIC must be exactly 13 digits:', profileData.cnic);
          return res.status(400).json({ message: 'CNIC must be exactly 13 digits' });
        }
        
        const existingCnic = await storage.getCandidateByCnic(profileData.cnic);
        if (existingCnic) {
          console.log('❌ [PROFILE UPDATE] CNIC already exists:', profileData.cnic);
          return res.status(400).json({ message: 'CNIC already exists' });
        }
      }
      
      console.log('📞 [PROFILE UPDATE] Calling storage.updateCandidate with data:', JSON.stringify(profileData, null, 2));
      const updatedCandidate = await storage.updateCandidate(candidate.id, profileData);
      
      // Handle projects if they are included in the request
      if (validatedData.projects) {
        console.log('🔍 [PROFILE UPDATE] Processing projects:', JSON.stringify(validatedData.projects, null, 2));
        
        // Get existing projects for this candidate
        const existingProjects = await storage.getCandidateProjects(candidate.id);
        
        // Process each project
        for (const project of validatedData.projects) {
          if (project.id) {
            // Update existing project
            await storage.updateProject(project.id, {
              title: project.title,
              description: project.description,
              techStack: project.techStack,
              githubUrl: project.githubUrl,
              candidateId: candidate.id
            }, candidate.id);
          } else {
            // Create new project
            await storage.createProject({
              title: project.title,
              description: project.description,
              techStack: project.techStack,
              githubUrl: project.githubUrl,
              candidateId: candidate.id
            });
          }
        }
        
        // Delete projects that are no longer in the list
        const projectIdsInRequest = validatedData.projects
          .filter((p: any) => p.id)
          .map((p: any) => p.id);
        
        for (const existingProject of existingProjects) {
          if (!projectIdsInRequest.includes(existingProject.id)) {
            await storage.deleteProject(existingProject.id, candidate.id);
          }
        }
      }
      
      // Map social links directly for frontend
      const responseCandidate = {
        ...updatedCandidate,
        linkedin: (updatedCandidate as any).linkedin ?? (updatedCandidate as any).linkedin_url,
        github: (updatedCandidate as any).github ?? (updatedCandidate as any).github_url,
      };
      
      res.json(responseCandidate);
    } catch (error: unknown) {
      console.error('❌ [PROFILE UPDATE] Error occurred:', error);
      
      if (error instanceof z.ZodError) {
        console.error('🔍 [PROFILE UPDATE] Zod validation errors:', JSON.stringify(error.errors, null, 2));
        return res.status(400).json({ message: 'Invalid input', errors: error.errors });
      }
      
      console.error('💥 [PROFILE UPDATE] Unexpected error:', error);
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

  app.put('/api/education/:id', authenticateToken, async (req: any, res) => {
    try {
      const educationId = parseInt(req.params.id);
      const educationData = insertEducationSchema.partial().parse(req.body);
      
      const updatedEducation = await storage.updateEducation(educationId, educationData);
      res.json(updatedEducation);
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid input', errors: error.errors });
      }
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

      // Ensure description is handled as JSON array
      if (experienceData.description && !Array.isArray(experienceData.description)) {
        experienceData.description = [experienceData.description];
      }

      const experience = await storage.createExperience(experienceData);
      
      // Convert description back to array for frontend
      if (experience.description && typeof experience.description === 'string') {
        try {
          experience.description = JSON.parse(experience.description);
        } catch (e) {
          experience.description = [experience.description];
        }
      }
      
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

  app.put('/api/experience/:id', authenticateToken, async (req: any, res) => {
    try {
      const experienceId = parseInt(req.params.id);
      const experienceData = insertExperienceSchema.partial().parse(req.body);
      
      // Ensure description is handled as JSON array
      if (experienceData.description && !Array.isArray(experienceData.description)) {
        experienceData.description = [experienceData.description];
      }
      
      const updatedExperience = await storage.updateExperience(experienceId, experienceData);
      
      // Convert description back to array for frontend
      if (updatedExperience.description && typeof updatedExperience.description === 'string') {
        try {
          updatedExperience.description = JSON.parse(updatedExperience.description);
        } catch (e) {
          updatedExperience.description = [updatedExperience.description];
        }
      }
      
      res.json(updatedExperience);
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid input', errors: error.errors });
      }
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

      // Call Python script to extract resume text (optional)
      let resumeText = '';
      try {
        // Check if Python is available
        const { spawn } = await import('child_process');
        const python = spawn(getPythonCommand(), ['--version'], { stdio: 'pipe' });
        
        await new Promise((resolve, reject) => {
          python.on('close', (code) => {
            if (code === 0) {
              // Python is available, proceed with text extraction
              const extractPython = spawn(getPythonCommand(), [
                './server/resume_parser/extract_resume_text.py',
                resumePath
              ], {
                env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
              });
              
              let output = '';
              let errorOutput = '';
              extractPython.stdout.on('data', (data) => {
                output += data.toString();
              });
              extractPython.stderr.on('data', (data) => {
                errorOutput += data.toString();
              });
              
              extractPython.on('close', (extractCode) => {
                if (extractCode === 0) {
                  resumeText = output;
                  console.log('Resume text extracted successfully');
                } else {
                  console.error('Resume parsing error:', errorOutput);
                  resumeText = '';
                }
                resolve(null);
              });
            } else {
              // Python not available, skip text extraction
              console.log('Python not available, skipping resume text extraction');
              resumeText = '';
              resolve(null);
            }
          });
        });
      } catch (err) {
        console.error('Failed to check Python or parse resume:', err);
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
      // Check if user is authenticated and is admin
      const token = req.cookies?.jwt_token || req.headers['authorization']?.split(' ')[1];
      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as any;
          if (decoded.role === 'admin') {
            // Admin gets all jobs (except deleted)
            const jobs = await storage.getAllJobs();
            res.json(jobs);
            return;
          }
        } catch (err) {
          // Token invalid, continue to public endpoint
        }
      }
      
      // Public endpoint - only active jobs
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
      
      // If assessmentTemplateId is provided, create the job-assessment link
      if (jobData.assessmentTemplateId) {
        await storage.createJobAssessment(job.id, {
          templateId: jobData.assessmentTemplateId,
          isRequired: true
        });
      }
      
      res.status(201).json(job);
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid input', errors: error.errors });
      }
      console.error('Job creation error:', error);
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

  app.delete('/api/jobs/:id', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.id);
      
      // Check if job exists
      const job = await storage.getJob(jobId);
      if (!job) {
        return res.status(404).json({ message: 'Job not found' });
      }
      
      // Check if job is already deleted
      if (job.status === 'deleted') {
        return res.status(400).json({ message: 'Job is already deleted' });
      }
      
      // Soft delete the job (mark as deleted)
      await storage.deleteJob(jobId);
      res.status(200).json({ message: 'Job deleted successfully' });
    } catch (error: unknown) {
      console.error('Job delete error:', error);
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

  app.delete('/api/job-templates/:id', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      await storage.deleteJobTemplate(parseInt(req.params.id));
      res.status(204).send();
    } catch (error: unknown) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Admin: Download applications as CSV for a job
  app.get('/api/jobs/:jobId/download-applications', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      
      // Fetch job details
      const job = await storage.getJob(jobId);
      if (!job) {
        return res.status(404).json({ message: 'Job not found' });
      }
      
      // Fetch all applications for the job with candidate profiles
      const applications = await storage.getApplicationsByJob(jobId);
      
      if (applications.length === 0) {
        return res.status(404).json({ message: 'No applications found for this job' });
      }
      
      // Get candidate profiles and skills for all applications
      const applicationsWithProfiles = await Promise.all(
        applications.map(async (application) => {
          const profile = await storage.getCandidateWithProfile(application.candidateId);
          const skills = await storage.getCandidateSkills(application.candidateId);
          return {
            application,
            profile,
            skills
          };
        })
      );
      
      // Create CSV content
      const csvHeaders = [
        'Application ID',
        'Job Title',
        'Candidate Name',
        'Email',
        'Phone',
        'City',
        'Date of Birth',
        'Applied Date',
        'Pipeline Status',
        'AI Score',
        'Education Score',
        'Skills Score', 
        'Experience Years Score',
        'Experience Relevance Score',
        'AI Reasoning',
        'Red Flags',
        'Education',
        'Experience',
        'Skills',
        'Motivation Letter'
      ];
      
      const csvRows = applicationsWithProfiles.map(({ application, profile, skills }) => {
        // Format education
        const education = profile?.education?.map(edu => 
          `${edu.degree} from ${edu.institution} (${edu.fromDate} - ${edu.toDate})`
        ).join('; ') || '';
        
        // Format experience
        const experience = profile?.experience?.map(exp => 
          `${exp.role} at ${exp.company} (${exp.fromDate} - ${exp.toDate}): ${exp.skills}`
        ).join('; ') || '';
        
        // Format skills
        const skillsList = skills?.map(skill => skill.skill).join(', ') || '';
        
        // Format AI reasoning (remove newlines for CSV)
        const reasoning = application.ai_score_breakdown?.reasoning?.replace(/\n/g, ' ') || '';
        
        // Format red flags
        const redFlags = Array.isArray(application.red_flags) 
          ? application.red_flags.join(', ')
          : application.red_flags || '';
        
        return [
          application.id,
          job.title,
          `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim(),
          profile?.email || '',
          profile?.phone || '',
          profile?.city || '',
          profile?.dateOfBirth || '',
          new Date(application.appliedAt).toLocaleDateString(),
          application.status,
          application.ai_score || '',
          application.ai_score_breakdown?.EducationScore || '',
          application.ai_score_breakdown?.SkillsScore || '',
          application.ai_score_breakdown?.ExperienceYearsScore || '',
          application.ai_score_breakdown?.ExperienceRelevanceScore || '',
          reasoning,
          redFlags,
          education,
          experience,
          skillsList,
          profile?.motivationLetter || ''
        ];
      });
      
      // Combine headers and rows
      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');
      
      // Set response headers for CSV download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="applications_${job.title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv"`);
      
      res.send(csvContent);
      
    } catch (error) {
      console.error('Error downloading applications CSV:', error);
      res.status(500).json({ message: 'Failed to download applications CSV', details: error?.message });
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

  app.post('/api/applications', authenticateToken, async (req: any, res) => {
    try {
      if (req.user.role === 'admin') {
        const applications = await storage.getApplications();
        return res.json(applications);
      } else {
        console.log('🔍 Application creation - User ID from token:', req.user.id);
        const candidate = await storage.getCandidate(req.user.id);
        console.log('🔍 Candidate fetched:', candidate);
        if (!candidate) {
          console.log('❌ No candidate found for user ID:', req.user.id);
          return res.status(404).json({ message: 'Profile not found' });
        }
        console.log('🔍 Using candidate ID for application:', candidate.id);

        // Check if candidate profile is complete before allowing job application
        const profile = await storage.getCandidateWithProfile(candidate.id);
        if (!profile) {
          return res.status(404).json({ message: 'Profile not found' });
        }

        // Validate profile completeness
        const isProfileComplete = (
          profile.firstName &&
          profile.lastName &&
          profile.dateOfBirth &&
          profile.apartment &&
          profile.street &&
          profile.area &&
          profile.city &&
          profile.province &&
          profile.postalCode &&
          profile.cnic &&
          profile.resumeUrl &&
          profile.motivationLetter &&
          profile.education &&
          Array.isArray(profile.education) &&
          profile.education.length > 0 &&
          profile.education.every((edu: any) => 
            edu.degree && edu.institution && edu.fromDate && edu.toDate
          )
        );

        if (!isProfileComplete) {
          return res.status(400).json({ 
            message: 'Profile incomplete. Please complete all required fields before applying for jobs.',
            requiredFields: [
              'Personal Information (Name, Date of Birth, CNIC)',
              'Complete Address',
              'Resume Upload',
              'Motivation Letter',
              'At least one Education entry'
            ]
          });
        }

        const applicationData = insertApplicationSchema.parse({
          ...req.body,
          candidateId: candidate.id
        });
        console.log('Application data to create:', applicationData);

        // Check if the job is active before allowing application
        const job = await storage.getJob(applicationData.jobId);
        if (!job) {
          return res.status(404).json({ message: 'Job not found' });
        }
        if (job.status !== 'active') {
          return res.status(400).json({ message: 'Cannot apply to inactive job' });
        }

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
          const py = spawn(getPythonCommand(), ['server/resume_parser/ai_scoring.py'], {
            env: { 
              ...process.env,
              GROQ_API_KEY: process.env.GROQ_API_KEY || ''
            }
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
              ai_score_breakdown: {
                ...aiResult.Scores,
                reasoning: aiResult.Reasoning || "No reasoning provided"
              },
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
      }
    } catch (error) {
      console.error('Error in POST /api/applications:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid input', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error' });
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
              const py = spawn(getPythonCommand(), ['./server/resume_parser/ai_scoring.py'], {
        env: { 
          ...process.env, 
          PYTHONIOENCODING: 'utf-8',
          GROQ_API_KEY: process.env.GROQ_API_KEY || ''
        }
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
          ai_score_breakdown: {
            ...aiResult.Scores,
            reasoning: aiResult.Reasoning || "No reasoning provided"
          },
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

  // Admin: Update application status
  app.put('/api/applications/:id', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      const applicationId = parseInt(req.params.id);
      const { status, source } = req.body;
      
      if (!status) {
        return res.status(400).json({ message: 'Status is required' });
      }
      
      // Validate status values
      const validStatuses = ['applied', 'shortlisted', 'interview', 'hired', 'onboarded', 'rejected'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: 'Invalid status value' });
      }
      
      // Prepare update data
      const updateData = { status };
      
      // Set hiredAt when status is changed to hired or onboarded
      if (status === 'hired' || status === 'onboarded') {
        updateData.hiredAt = new Date();
        console.log('🔍 Setting hiredAt for application', applicationId, 'to', updateData.hiredAt);
      }
      
      // Set source if provided
      if (source) {
        updateData.source = source;
        console.log('🔍 Setting source for application', applicationId, 'to', source);
      }
      
      // Update application
      await storage.updateApplication(applicationId, updateData);
      
      // Fetch updated application
      const updatedApplication = await storage.getApplication(applicationId);
      
      console.log('🔍 Application updated:', { id: applicationId, status, hiredAt: updateData.hiredAt, source: updateData.source });
      
      res.json(updatedApplication);
    } catch (error) {
      console.error('Error updating application status:', error);
      res.status(500).json({ message: 'Failed to update application status', details: error?.message });
    }
  });

  // Batch regenerate AI scores for all applications of a job
  app.post('/api/jobs/:jobId/regenerate-scores', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const weights = req.body.weights;
      
      console.log('Regenerating scores for job:', jobId);
      console.log('Weights received:', weights);
      
      if (!weights || typeof weights !== 'object') {
        return res.status(400).json({ message: 'Weights are required.' });
      }
      
      // Fetch all applications for the job
      const applications = await storage.getApplicationsByJob(jobId);
      const job = await storage.getJob(jobId);
      
      console.log('Found applications:', applications.length);
      console.log('Job:', job?.title);
      console.log('Applications:', applications.map(app => ({ id: app.id, candidateId: app.candidateId, status: app.status })));
      
      if (!job) {
        return res.status(404).json({ message: 'Job not found.' });
      }
      
      let updated = [];
      let processed = 0;
      let skipped = 0;
      
      for (const application of applications) {
        console.log(`\n--- Processing application ${processed + 1}/${applications.length} ---`);
        console.log(`Application ID: ${application.id}, Candidate ID: ${application.candidateId}, Status: ${application.status}`);
        
        const profile = await storage.getCandidateWithProfile(application.candidateId);
        console.log(`Profile found: ${!!profile}`);
        console.log(`Profile data:`, {
          id: profile?.id,
          firstName: profile?.firstName,
          lastName: profile?.lastName,
          hasResumeText: !!profile?.resumeText,
          resumeTextLength: profile?.resumeText?.length || 0,
          hasExperience: !!profile?.experience?.length,
          hasEducation: !!profile?.education?.length,
          resumeTextPreview: profile?.resumeText?.substring(0, 50) || 'No resume text'
        });
        
        if (!profile) {
          console.log(`Skipping application ${application.id} - no profile found`);
          skipped++;
          continue;
        }
        
        if (!profile.resumeText) {
          console.log(`Skipping application ${application.id} - no resume text`);
          console.log(`Profile keys:`, Object.keys(profile));
          skipped++;
          continue;
        }
        
        const experience_dates = (profile.experience || []).map((e: any) => [e.fromDate, e.toDate]);
        const education_dates = (profile.education || []).map((e: any) => [e.fromDate, e.toDate]);
        
        console.log(`Experience dates: ${experience_dates.length}`);
        console.log(`Education dates: ${education_dates.length}`);
        console.log(`Resume text preview: ${profile.resumeText.substring(0, 100)}...`);
        
        const aiInput = {
          resume: profile.resumeText,
          job_description: job.description || '',
          experience_dates,
          education_dates,
          weights,
          groq_api_key: process.env.GROQ_API_KEY || undefined
        };
        
        console.log('=== AI INPUT DEBUG ===');
        console.log('Weights:', aiInput.weights);
        console.log('Resume text length:', aiInput.resume.length);
        console.log('Resume text preview:', aiInput.resume.substring(0, 200) + '...');
        console.log('Job description length:', aiInput.job_description.length);
        console.log('Job description preview:', aiInput.job_description.substring(0, 200) + '...');
        console.log('Experience dates count:', aiInput.experience_dates.length);
        console.log('Education dates count:', aiInput.education_dates.length);
        console.log('=== END AI INPUT DEBUG ===');
        
        // Validate input data
        if (!aiInput.resume || aiInput.resume.trim().length === 0) {
          console.log(`ERROR: No resume text for application ${application.id}`);
          skipped++;
          continue;
        }
        
        if (!aiInput.job_description || aiInput.job_description.trim().length === 0) {
          console.log(`ERROR: No job description for application ${application.id}`);
          skipped++;
          continue;
        }
        
        const { spawn } = await import('child_process');
        let output = '';
        let errorOutput = '';
        
        console.log('Starting Python process...');
        console.log('Input JSON size:', JSON.stringify(aiInput).length, 'characters');
        
        // Check if Python script exists
        const fs = await import('fs');
        const path = await import('path');
        const scriptPath = path.join(process.cwd(), 'server', 'resume_parser', 'ai_scoring.py');
        console.log('Python script path:', scriptPath);
        console.log('Script exists:', fs.existsSync(scriptPath));
        
        const py = spawn(getPythonCommand(), [scriptPath], {
          env: { 
            ...process.env, 
            PYTHONIOENCODING: 'utf-8',
            GROQ_API_KEY: process.env.GROQ_API_KEY || ''
          }
        });
        
        py.stdout.on('data', (data: any) => { 
          output += data.toString();
          console.log('Python stdout:', data.toString());
        });
        
        py.stderr.on('data', (data: any) => { 
          errorOutput += data.toString();
          console.log('Python stderr:', data.toString());
        });
        
        py.on('error', (error: any) => {
          console.error('Python process error:', error);
        });
        
        const inputJson = JSON.stringify(aiInput);
        console.log('Sending input to Python script...');
        console.log('Input JSON size:', inputJson.length, 'characters');
        console.log('Input JSON preview:', inputJson.substring(0, 500) + '...');
        
        py.stdin.write(inputJson);
        py.stdin.end();
        console.log('Input sent to Python script');
        
        // Add timeout and better error handling
        try {
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              console.log('Python process timed out');
              py.kill();
              reject(new Error('Python process timed out'));
            }, 30000); // 30 second timeout
            
            py.on('close', (code) => {
              clearTimeout(timeout);
              console.log(`Python process exited with code ${code}`);
              console.log(`Python stdout length: ${output.length}`);
              console.log(`Python stderr length: ${errorOutput.length}`);
              
              if (code !== 0) {
                console.log('Python stderr output:', errorOutput);
                reject(new Error(`Python process failed with code ${code}`));
              } else {
                console.log('Python process completed successfully');
                resolve(null);
              }
            });
          });
        } catch (error) {
          console.error('Python process error:', error);
          console.log('Skipping this application due to Python process failure');
          skipped++;
          continue;
        }
        
        let aiResult;
        try {
          console.log('Attempting to parse AI result...');
          console.log('Raw output length:', output.length);
          console.log('Raw output:', output);
          
          if (!output || output.trim().length === 0) {
            console.log('ERROR: No output from Python script');
            aiResult = null;
          } else {
            aiResult = JSON.parse(output);
            console.log('AI Result parsed successfully:', aiResult);
            console.log('Weighted Score:', aiResult.WeightedScore);
            console.log('Scores Breakdown:', aiResult.Scores);
            console.log('Red Flags:', aiResult.RedFlag);
          }
        } catch (e: unknown) {
          console.error('Failed to parse AI result:', e);
          console.log('Raw output:', output);
          console.log('Error output:', errorOutput);
          aiResult = null;
        }
        
        if (aiResult && aiResult.WeightedScore !== undefined) {
          console.log(`Updating application ${application.id} with score ${aiResult.WeightedScore}`);
          await storage.updateApplication(application.id, {
            ai_score: aiResult.WeightedScore,
            ai_score_breakdown: {
              ...aiResult.Scores,
              reasoning: aiResult.Reasoning || "No reasoning provided"
            },
            red_flags: aiResult.RedFlag
          });
          updated.push({ 
            applicationId: application.id, 
            ai_score: aiResult.WeightedScore, 
            red_flags: aiResult.RedFlag 
          });
          console.log(`Successfully updated application ${application.id} with score ${aiResult.WeightedScore}`);
        } else {
          console.log(`No valid AI result for application ${application.id}`);
          console.log('AI Result was:', aiResult);
        }
        
        processed++;
      }
      
      console.log(`\n=== PROCESSING SUMMARY ===`);
      console.log(`Total applications: ${applications.length}`);
      console.log(`Processed: ${processed}`);
      console.log(`Skipped: ${skipped}`);
      console.log(`Successfully updated: ${updated.length}`);
      console.log(`Updated applications:`, updated.map(u => ({ id: u.applicationId, score: u.ai_score })));
      
      res.json({ 
        updated,
        summary: {
          total: applications.length,
          processed,
          skipped,
          updated: updated.length
        }
      });
    } catch (error: unknown) {
      console.error('Error in regenerate-scores:', error);
      res.status(500).json({ message: 'Failed to batch regenerate AI scores', details: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Chatbot API endpoint
  app.post('/api/chat', authenticateToken, async (req: any, res) => {
    try {
      const { message, conversation_history = [] } = req.body;
      const user = req.user;
      
      if (!message) {
        return res.status(400).json({ message: 'Message is required' });
      }
      
      // Call Python chatbot
      const { spawn } = await import('child_process');
      const pythonProcess = spawn('python', [
        'Chatbot/groq_db_v2.py',
        '--message', message,
        '--user-id', user.id.toString(),
        '--user-role', user.role,
        '--history', JSON.stringify(conversation_history)
      ], {
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
      });
      
      let result = '';
      let error = '';
      
      pythonProcess.stdout?.on('data', (data: Buffer) => {
        result += data.toString();
      });
      
      pythonProcess.stderr?.on('data', (data: Buffer) => {
        error += data.toString();
      });
      
      const timeoutId = setTimeout(() => {
        pythonProcess.kill();
        res.status(408).json({ message: 'Chatbot request timed out' });
      }, 120000); // 2 minutes timeout
      
      pythonProcess.on('close', (code: number | null) => {
        clearTimeout(timeoutId);
        if (code !== 0) {
          console.error('Python chatbot error:', error);
          return res.status(500).json({ 
            message: 'Chatbot service error',
            error: error || 'Unknown error'
          });
        }
        
        try {
          result = result.trim();
          if (!result) {
            return res.status(500).json({ message: 'Chatbot returned empty response' });
          }
          
          const parsedResult = JSON.parse(result);
          res.json(parsedResult);
        } catch (parseError: any) {
          console.error('Failed to parse chatbot response:', parseError);
          res.status(500).json({ 
            message: 'Failed to parse chatbot response',
            error: parseError.message
          });
        }
      });
      
      pythonProcess.on('error', (err: Error) => {
        clearTimeout(timeoutId);
        console.error('Failed to start Python chatbot:', err);
        res.status(500).json({ 
          message: 'Failed to start chatbot service',
          error: err.message
        });
      });
      
    } catch (error: any) {
      console.error('Chatbot API error:', error);
      res.status(500).json({ message: 'Chatbot service error' });
    }
  });

  // Test endpoint to check candidates with resume text
  app.get('/api/test-candidates-resume', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      const candidateData = await db.select({
        id: candidates.id,
        firstName: candidates.firstName,
        lastName: candidates.lastName,
        hasResumeText: sql`CASE WHEN ${candidates.resumeText} IS NOT NULL AND ${candidates.resumeText} != '' THEN true ELSE false END`,
        resumeTextLength: sql`LENGTH(${candidates.resumeText})`,
        resumeTextPreview: sql`LEFT(${candidates.resumeText}, 100)`
      }).from(candidates).limit(10);
      
      res.json({ candidates: candidateData });
    } catch (error: unknown) {
      console.error('Error checking candidates:', error);
      res.status(500).json({ 
        message: 'Failed to check candidates', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Test endpoint for AI scoring
  app.post('/api/test-ai-scoring', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      const { resume, job_description, weights } = req.body;
      
      console.log('Test AI scoring with weights:', weights);
      
      const aiInput = {
        resume: resume || 'Sample resume text',
        job_description: job_description || 'Sample job description',
        experience_dates: [],
        education_dates: [],
        weights: weights || {
          EducationScore: 0.4,
          SkillsScore: 0.3,
          ExperienceYearsScore: 0.2,
          ExperienceRelevanceScore: 0.1,
        }
      };
      
      const { spawn } = await import('child_process');
      const fs = await import('fs');
      const path = await import('path');
      
      let output = '';
      let errorOutput = '';
      
      const scriptPath = path.join(process.cwd(), 'server', 'resume_parser', 'ai_scoring.py');
      console.log('Test Python script path:', scriptPath);
      console.log('Test Script exists:', fs.existsSync(scriptPath));
      
              const py = spawn(getPythonCommand(), [scriptPath], {
        env: { 
          ...process.env, 
          PYTHONIOENCODING: 'utf-8',
          GROQ_API_KEY: process.env.GROQ_API_KEY || ''
        }
      });
      
      py.stdout.on('data', (data: any) => { 
        output += data.toString();
        console.log('Test Python stdout:', data.toString());
      });
      
      py.stderr.on('data', (data: any) => { 
        errorOutput += data.toString();
        console.log('Test Python stderr:', data.toString());
      });
      
      py.on('error', (error: any) => {
        console.error('Test Python process error:', error);
      });
      
      const inputJson = JSON.stringify(aiInput);
      console.log('Test Input JSON size:', inputJson.length, 'characters');
      py.stdin.write(inputJson);
      py.stdin.end();
      
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.log('Test Python process timed out');
          py.kill();
          reject(new Error('Test Python process timed out'));
        }, 30000);
        
        py.on('close', (code) => {
          clearTimeout(timeout);
          console.log(`Test Python process exited with code ${code}`);
          if (code !== 0) {
            console.log('Test Python stderr output:', errorOutput);
            reject(new Error(`Test Python process failed with code ${code}`));
          } else {
            resolve(null);
          }
        });
      });
      
      let aiResult;
      try {
        aiResult = JSON.parse(output);
        console.log('Test AI Result:', aiResult);
      } catch (e: unknown) {
        console.error('Failed to parse test AI result:', e);
        console.log('Test Raw output:', output);
        aiResult = null;
      }
      
      res.json({ 
        success: true, 
        result: aiResult, 
        output, 
        errorOutput 
      });
    } catch (error: unknown) {
      console.error('Error in test AI scoring:', error);
      res.status(500).json({ 
        message: 'Failed to test AI scoring', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Email templates - Allow access for authenticated users (not just admins)
  app.get('/api/email-templates', authenticateToken, async (req: any, res) => {
    try {
      console.log('🔍 Fetching email templates for user:', req.user);
      const templates = await storage.getEmailTemplates();
      console.log('📧 Found email templates:', templates);
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

  // Test endpoint - no authentication required
  app.get('/api/test-email-templates', async (req: any, res) => {
    try {
      console.log('🧪 Test endpoint: Fetching email templates');
      const templates = await storage.getEmailTemplates();
      console.log('📧 Test endpoint found templates:', templates);
      res.json({
        success: true,
        count: templates.length,
        templates: templates
      });
    } catch (error: unknown) {
      console.error('Test endpoint error:', error);
      res.status(500).json({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
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

  // Send email endpoint
  app.post('/api/send-email', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      const { templateId, candidateId, adminId, subject, body } = req.body;
      
      if (!templateId || !candidateId || !adminId || !subject || !body) {
        return res.status(400).json({ 
          message: 'Missing required fields: templateId, candidateId, adminId, subject, body' 
        });
      }

      // Get candidate data for validation (including email from user table)
      const candidate = await storage.getCandidateWithProfile(candidateId);
      if (!candidate) {
        return res.status(404).json({ message: 'Candidate not found' });
      }

      // Debug: Log candidate data
      console.log('📧 Candidate data for email:', {
        id: candidate.id,
        email: candidate.email,
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        userId: candidate.userId
      });

      // Validate candidate email
      if (!candidate.email) {
        console.log('❌ Candidate email is missing!');
        console.log('❌ Full candidate object:', JSON.stringify(candidate, null, 2));
        return res.status(400).json({ 
          message: 'Candidate email is missing or invalid',
          candidateId: candidateId
        });
      }

      console.log('✅ Candidate email found:', candidate.email);

      // Use the subject and body from the request (already filled by frontend)
      const emailSubject = subject;
      const emailBody = body;

      // Import Gmail service dynamically to avoid circular dependencies
      const { sendEmail } = await import('./gmailService');
      
      // Send email via Gmail API
      await sendEmail({
        from: 'HR Department <noreply@nastp.com>',
        to: candidate.email,
        subject: emailSubject,
        body: emailBody,
      });

      // Log the sent email
      await storage.logSentEmail({
        candidateId: candidateId,
        templateId: templateId,
        adminId: adminId,
        subject: emailSubject,
        body: emailBody,
        recipientEmail: candidate.email,
        status: 'sent'
      });

      res.json({ 
        success: true, 
        message: 'Email sent successfully',
        recipient: candidate.email,
        subject: emailSubject
      });
    } catch (error: unknown) {
      console.error('Error sending email:', error);
      
      // Log failed email attempt
      try {
        await storage.logSentEmail({
          candidateId: req.body.candidateId,
          templateId: req.body.templateId,
          adminId: req.body.adminId,
          subject: 'Failed to send',
          body: 'Email sending failed',
          recipientEmail: req.body.recipientEmail || 'unknown',
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        });
      } catch (logError) {
        console.error('Failed to log email error:', logError);
      }

      const errorMessage = error instanceof Error ? error.message : 'Server error';
      res.status(500).json({ 
        message: 'Failed to send email', 
        error: errorMessage
      });
    }
  });

  // Get sent emails history
  app.get('/api/sent-emails', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      const { candidateId } = req.query;
      const emails = await storage.getSentEmails(candidateId ? parseInt(candidateId) : undefined);
      res.json(emails);
    } catch (error: unknown) {
      console.error('Error getting sent emails:', error);
      const errorMessage = error instanceof Error ? error.message : 'Server error';
      res.status(500).json({ 
        message: 'Failed to get sent emails', 
        error: errorMessage
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
      console.log('Creating assessment template with data:', req.body);
      const template = await storage.createAssessmentTemplate(req.body);
      console.log('Assessment template created successfully:', template);
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
    console.log(`🔧 [ROUTE] Assessment template update request received`);
    console.log(`📊 [ROUTE] Request details:`, {
      templateId: req.params.id,
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      contentType: req.get('Content-Type')
    });
    console.log(`👤 [ROUTE] User details:`, {
      id: req.user?.id,
      email: req.user?.email,
      role: req.user?.role
    });
    console.log(`📦 [ROUTE] Request body:`, JSON.stringify(req.body, null, 2));
    
    try {
      const templateId = parseInt(req.params.id);
      console.log(`🔍 [ROUTE] Parsed template ID: ${templateId} (original: ${req.params.id})`);
      
      if (isNaN(templateId)) {
        console.error(`❌ [ROUTE] Invalid template ID: ${req.params.id}`);
        return res.status(400).json({ message: 'Invalid template ID' });
      }
      
      // Validate and clean the request body
      const updateData: any = {};
      const allowedFields = [
        'title', 'description', 'categoryId', 'durationMinutes', 
        'passingScore', 'isActive', 'createdBy'
      ];
      
      console.log(`🧹 [ROUTE] Cleaning update data...`);
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          // Convert numeric fields
          if (field === 'categoryId' || field === 'durationMinutes' || field === 'passingScore' || field === 'createdBy') {
            const numValue = Number(req.body[field]);
            if (!isNaN(numValue)) {
              updateData[field] = numValue;
              console.log(`✅ [ROUTE] Validated numeric field ${field}: ${numValue}`);
            } else {
              console.warn(`⚠️ [ROUTE] Invalid numeric value for ${field}: ${req.body[field]}`);
            }
          }
          // Convert boolean fields
          else if (field === 'isActive') {
            updateData[field] = Boolean(req.body[field]);
            console.log(`✅ [ROUTE] Validated boolean field ${field}: ${updateData[field]}`);
          }
          // String fields
          else {
            updateData[field] = String(req.body[field]);
            console.log(`✅ [ROUTE] Validated string field ${field}: "${updateData[field]}"`);
          }
        }
      }
      
      console.log(`🧹 [ROUTE] Cleaned update data:`, JSON.stringify(updateData, null, 2));
      
      // Check if there's any data to update
      if (Object.keys(updateData).length === 0) {
        console.warn(`⚠️ [ROUTE] No valid fields to update`);
        return res.status(400).json({ message: 'No valid fields to update' });
      }
      
      console.log(`📞 [ROUTE] Calling storage.updateAssessmentTemplate with templateId: ${templateId}`);
      const template = await storage.updateAssessmentTemplate(templateId, updateData);
      
      console.log(`✅ [ROUTE] Assessment template updated successfully`);
      console.log(`📊 [ROUTE] Updated template:`, {
        id: template.id,
        title: template.title,
        updatedAt: new Date().toISOString()
      });
      
      res.json(template);
    } catch (error: unknown) {
      console.error(`❌ [ROUTE] Error updating assessment template:`, error);
      console.error(`❌ [ROUTE] Error type:`, typeof error);
      console.error(`❌ [ROUTE] Error message:`, error instanceof Error ? error.message : 'Unknown error');
      console.error(`❌ [ROUTE] Error stack:`, error instanceof Error ? error.stack : 'No stack available');
      console.error(`❌ [ROUTE] Request details:`, {
        templateId: req.params.id,
        body: JSON.stringify(req.body, null, 2),
        user: req.user
      });
      
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
      res.status(500).json({ message: 'Server error' });
    }
  });

  // --- Candidate Pending Assessments ---
  app.get('/api/candidate/pending-assessments', authenticateToken, async (req: any, res) => {
    try {
      const userId = req.user.id;
      console.log('🔍 Pending assessments requested for user ID:', userId);
      
      if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
      }

      // First, get the candidate record for this user
      const candidate = await storage.getCandidate(userId);
      console.log('🔍 Found candidate record:', candidate);
      
      if (!candidate) {
        console.log('❌ No candidate record found for user ID:', userId);
        return res.status(404).json({ message: 'Candidate profile not found' });
      }

      const candidateId = candidate.id;
      console.log('🔍 Using candidate ID:', candidateId);

      // Get all applications for the candidate
      const applications = await storage.getApplicationsByCandidate(candidateId);
      console.log('🔍 All applications for candidate:', applications);
      
      // Filter applications that have pending assessments
      const pendingApplications = applications.filter((app: any) => 
        app.assessmentStatus === 'pending'
      );
      
      console.log('🔍 Pending applications:', pendingApplications);
      
      // Get all job assessments for these pending applications
      const allAssessments = [];
      const jobIds = [...new Set(pendingApplications.map((app: any) => app.jobId))];
      
      console.log('🔍 Job IDs with pending assessments:', jobIds);
      
      for (const jobId of jobIds) {
        try {
          console.log(`🔍 Fetching assessments for job ${jobId}`);
          
          // Check if the job is still active
          const job = await storage.getJob(jobId);
          if (!job || job.status !== 'active') {
            console.log(`🔍 Skipping job ${jobId} - job not found or not active (status: ${job?.status})`);
            continue;
          }
          
          const jobAssessments = await storage.getJobAssessments(jobId);
          console.log(`🔍 Found ${jobAssessments.length} assessments for job ${jobId}`);
          
          for (const assessment of jobAssessments) {
            try {
              console.log(`🔍 Processing assessment ${assessment.id} for template ${assessment.templateId}`);
              // Check if there's already an attempt for this assessment
              const existingAttempt = await storage.findAssessmentAttempt(
                candidateId,
                assessment.templateId,
                jobId
              );
              
              console.log(`🔍 Existing attempt for template ${assessment.templateId}:`, existingAttempt);
              
              // Only include assessments that don't have a completed attempt
              // Exclude completed, failed, or expired assessments
              if (!existingAttempt || 
                  (existingAttempt.status !== 'completed' && 
                   existingAttempt.status !== 'failed' && 
                   existingAttempt.status !== 'expired') || existingAttempt.status === 'in_progress') {
                console.log(`🔍 Fetching template for assessment ${assessment.id}`);
                const template = await storage.getAssessmentTemplate(assessment.templateId);
                console.log(`🔍 Template data for ${assessment.templateId}:`, template);
                
                if (template) {
                  const assessmentData = {
                    ...assessment,
                    template,
                    jobId,
                    attemptId: existingAttempt?.id,
                    status: existingAttempt?.status || 'not_started',
                    // Add application info for context
                    applicationId: pendingApplications.find(app => app.jobId === jobId)?.id,
                    applicationStatus: 'pending'
                  };
                  console.log('✅ Adding assessment:', assessmentData);
                  allAssessments.push(assessmentData);
                }
              }
            } catch (innerError) {
              console.error(`❌ Error processing assessment ${assessment.id}:`, innerError);
            }
          }
        } catch (jobError) {
          console.error(`❌ Error fetching assessments for job ${jobId}:`, jobError);
        }
      }
      
      console.log('🔍 Final assessments to return:', allAssessments);
      res.json(allAssessments);
    } catch (error: unknown) {
      console.error('❌ Error getting pending assessments:', error);
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
      console.log('🔍 Assessment start request received');
      console.log('🔍 User from token:', req.user);
      console.log('🔍 Request body:', req.body);
      console.log('🔍 Template ID param:', req.params.templateId);
      
      const templateId = parseInt(req.params.templateId);
      const jobId = req.body.jobId ? parseInt(req.body.jobId) : undefined;
      
      console.log('🔍 Parsed templateId:', templateId, 'jobId:', jobId);
      
      if (isNaN(templateId)) {
        console.log('❌ Invalid template ID:', req.params.templateId);
        return res.status(400).json({ 
          success: false,
          message: 'Invalid template ID' 
        });
      }

      console.log('🔍 Getting candidate for user ID:', req.user.id);
      const candidate = await storage.getCandidate(req.user.id);
      console.log('🔍 Candidate result:', candidate);
      
      if (!candidate) {
        console.log('❌ No candidate found for user ID:', req.user.id);
        return res.status(404).json({ 
          success: false,
          message: 'Candidate not found' 
        });
      }

      // If this is a job-specific assessment, check if the job is active
      if (jobId) {
        const job = await storage.getJob(jobId);
        if (!job) {
          return res.status(404).json({
            success: false,
            message: 'Job not found'
          });
        }
        if (job.status !== 'active') {
          return res.status(400).json({
            success: false,
            message: 'Cannot start assessment for inactive job'
          });
        }
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
      
      // Get candidate ID from user ID
      const candidate = await storage.getCandidate(req.user.id);
      if (!candidate) {
        return res.status(404).json({ message: 'Candidate profile not found' });
      }
      
      let attempt = await storage.findAssessmentAttempt(candidate.id, templateId, jobId);
      if (!attempt) {
        const result = await storage.startAssessment(templateId, candidate.id, jobId);
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
    console.log(`🚀 [ROUTE] Assessment submission request received`);
    console.log(`📊 [ROUTE] Request details:`, {
      attemptId: req.params.attemptId,
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      contentType: req.get('Content-Type'),
      contentLength: req.get('Content-Length')
    });
    console.log(`👤 [ROUTE] User details:`, {
      id: req.user?.id,
      email: req.user?.email,
      role: req.user?.role
    });
    console.log(`📦 [ROUTE] Request body:`, JSON.stringify(req.body, null, 2));
    
    try {
      // Check if request was aborted
      if (req.aborted) {
        console.log(`❌ [ROUTE] Request was aborted before processing`);
        return res.status(499).json({ message: 'Request aborted' });
      }
      
      const attemptId = parseInt(req.params.attemptId);
      console.log(`🔍 [ROUTE] Parsed attempt ID: ${attemptId} (original: ${req.params.attemptId})`);
      
      if (isNaN(attemptId)) {
        console.error(`❌ [ROUTE] Invalid attempt ID: ${req.params.attemptId}`);
        return res.status(400).json({ message: 'Invalid attempt ID' });
      }
      
      // Check if candidate profile is complete before allowing assessment
      const candidate = await storage.getCandidate(req.user.id);
      if (!candidate) {
        return res.status(404).json({ message: 'Candidate profile not found' });
      }

      const profile = await storage.getCandidateWithProfile(candidate.id);
      if (!profile) {
        return res.status(404).json({ message: 'Profile not found' });
      }

      // Validate profile completeness
      const isProfileComplete = (
        profile.firstName &&
        profile.lastName &&
        profile.dateOfBirth &&
        profile.apartment &&
        profile.street &&
        profile.area &&
        profile.city &&
        profile.province &&
        profile.postalCode &&
        profile.cnic &&
        profile.resumeUrl &&
        profile.motivationLetter &&
        profile.education &&
        Array.isArray(profile.education) &&
        profile.education.length > 0 &&
        profile.education.every((edu: any) => 
          edu.degree && edu.institution && edu.fromDate && edu.toDate
        )
      );

      if (!isProfileComplete) {
        return res.status(400).json({ 
          message: 'Profile incomplete. Please complete all required fields before taking assessments.',
          requiredFields: [
            'Personal Information (Name, Date of Birth, CNIC)',
            'Complete Address',
            'Resume Upload',
            'Motivation Letter',
            'At least one Education entry'
          ]
        });
      }
      
      console.log(`📞 [ROUTE] Calling storage.submitAssessment with attemptId: ${attemptId}`);
      const result = await storage.submitAssessment(attemptId, req.body);
      
      console.log(`✅ [ROUTE] Assessment submission successful`);
      console.log(`📊 [ROUTE] Submission result:`, JSON.stringify(result, null, 2));
      
      res.json(result);
    } catch (error: unknown) {
      console.error(`❌ [ROUTE] Error submitting assessment:`, error);
      console.error(`❌ [ROUTE] Error type:`, typeof error);
      console.error(`❌ [ROUTE] Error message:`, error instanceof Error ? error.message : 'Unknown error');
      console.error(`❌ [ROUTE] Error stack:`, error instanceof Error ? error.stack : 'No stack available');
      console.error(`❌ [ROUTE] Request details:`, {
        attemptId: req.params.attemptId,
        body: JSON.stringify(req.body, null, 2),
        user: req.user
      });
      
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
    console.log(`🔍 [ROUTE] Assessment results request received`);
    console.log(`📊 [ROUTE] Request details:`, {
      attemptId: req.params.attemptId,
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent')
    });
    console.log(`👤 [ROUTE] User details:`, {
      id: req.user?.id,
      email: req.user?.email,
      role: req.user?.role
    });
    
    try {
      const attemptId = parseInt(req.params.attemptId);
      console.log(`🔍 [ROUTE] Parsed attempt ID: ${attemptId} (original: ${req.params.attemptId})`);
      
      if (isNaN(attemptId)) {
        console.error(`❌ [ROUTE] Invalid attempt ID: ${req.params.attemptId}`);
        return res.status(400).json({ message: 'Invalid attempt ID' });
      }
      
      console.log(`📞 [ROUTE] Calling storage.getAssessmentResults with attemptId: ${attemptId}`);
      const result = await storage.getAssessmentResults(attemptId);
      
      console.log(`✅ [ROUTE] Assessment results retrieved successfully`);
      console.log(`📊 [ROUTE] Results summary:`, {
        score: result.score,
        maxScore: result.maxScore,
        passed: result.passed,
        status: result.status,
        questionCount: result.questions?.length || 0
      });
      
      res.json(result);
    } catch (error: unknown) {
      console.error(`❌ [ROUTE] Error getting assessment results:`, error);
      console.error(`❌ [ROUTE] Error type:`, typeof error);
      console.error(`❌ [ROUTE] Error message:`, error instanceof Error ? error.message : 'Unknown error');
      console.error(`❌ [ROUTE] Error stack:`, error instanceof Error ? error.stack : 'No stack available');
      console.error(`❌ [ROUTE] Request details:`, {
        attemptId: req.params.attemptId,
        user: req.user
      });
      
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
      console.log('🔍 Dashboard KPIs endpoint called');
      const { startDate, endDate, department } = req.query;
      console.log('🔍 Query params:', { startDate, endDate, department });
      
      const start = typeof startDate === 'string' ? startDate : undefined;
      const end = typeof endDate === 'string' ? endDate : undefined;
      const dept = typeof department === 'string' ? department : undefined;
      
      let jobs = await storage.getJobs();
      console.log('🔍 Total jobs from storage:', jobs.length);
      console.log('🔍 Jobs:', jobs.map(j => ({ id: j.id, title: j.title, status: j.status })));
      
      if (dept) {
        jobs = jobs.filter((j: any) => j.department === dept);
        console.log('🔍 Filtered jobs by department:', jobs.length);
      }
      
      const jobIds = jobs.map((j: any) => j.id);
      console.log('🔍 Job IDs for filtering:', jobIds);
      
      // Count all successful hires (both 'hired' and 'onboarded' statuses)
      const successfulHires = await db.select().from(applications).where(
        or(eq(applications.status, 'hired'), eq(applications.status, 'onboarded'))
      );
      console.log('🔍 All successful hires from DB:', successfulHires.length);
      console.log('🔍 Successful hires details:', successfulHires.map(h => ({ 
        id: h.id, 
        jobId: h.jobId, 
        status: h.status, 
        hiredAt: h.hiredAt, 
        appliedAt: h.appliedAt 
      })));
      
      const filteredSuccessfulHires = successfulHires.filter((app: any) => jobIds.includes(app.jobId) &&
        (!start || new Date(app.hiredAt) >= new Date(start)) &&
        (!end || new Date(app.hiredAt) <= new Date(end)));
      console.log('🔍 Filtered successful hires:', filteredSuccessfulHires.length);
      console.log('🔍 Filtered hires details:', filteredSuccessfulHires.map(h => ({ 
        id: h.id, 
        jobId: h.jobId, 
        status: h.status, 
        hiredAt: h.hiredAt, 
        appliedAt: h.appliedAt 
      })));
      
      let avgTimeToHire = null;
      if (filteredSuccessfulHires.length > 0) {
        const totalDays = filteredSuccessfulHires.reduce((sum, app) => {
          if (app.hiredAt && app.appliedAt) {
            const diff = (new Date(app.hiredAt).getTime() - new Date(app.appliedAt).getTime()) / (1000 * 60 * 60 * 24);
            console.log('🔍 Time to hire for app', app.id, ':', diff, 'days');
            return sum + diff;
          }
          return sum;
        }, 0);
        avgTimeToHire = totalDays / filteredSuccessfulHires.length;
        console.log('🔍 Total days:', totalDays, 'Average:', avgTimeToHire);
      }
      
      // Calculate offer acceptance rate based on onboarded vs hired status
      // onboarded = accepted offer, hired = pending offer response
      const hiredApplications = filteredSuccessfulHires.filter(app => app.status === 'hired');
      const onboardedApplications = filteredSuccessfulHires.filter(app => app.status === 'onboarded');
      
      let offerAcceptanceRate = null;
      if (hiredApplications.length > 0 || onboardedApplications.length > 0) {
        const totalOffers = hiredApplications.length + onboardedApplications.length;
        const acceptedOffers = onboardedApplications.length;
        offerAcceptanceRate = (acceptedOffers / totalOffers) * 100;
        console.log('🔍 Total offers (hired + onboarded):', totalOffers);
        console.log('🔍 Accepted offers (onboarded):', acceptedOffers);
        console.log('🔍 Offer acceptance rate:', offerAcceptanceRate);
      }
      
      // Calculate cost per hire based on salary_min instead of job_costs table
      let costPerHire = null;
      if (onboardedApplications.length > 0) {
        // Get salary information for jobs with onboarded candidates
        const onboardedJobIds = onboardedApplications.map(app => app.jobId);
        const jobsWithOnboarded = jobs.filter(job => onboardedJobIds.includes(job.id));
        
        if (jobsWithOnboarded.length > 0) {
          const totalSalary = jobsWithOnboarded.reduce((sum, job) => sum + (job.salaryMin || 0), 0);
          costPerHire = totalSalary / onboardedApplications.length;
          console.log('🔍 Jobs with onboarded candidates:', jobsWithOnboarded.map(j => ({ id: j.id, title: j.title, salaryMin: j.salaryMin })));
          console.log('🔍 Total salary for onboarded jobs:', totalSalary);
          console.log('🔍 Cost per hire (salary-based):', costPerHire);
        }
      }
      
      const result = { 
        totalJobs: jobs.length, 
        totalHires: filteredSuccessfulHires.length, 
        avgTimeToHire, 
        offerAcceptanceRate, 
        costPerHire 
      };
      console.log('🔍 Final KPIs result:', result);
      
      res.json(result);
    } catch (error) {
      console.error('❌ Error in dashboard KPIs:', error);
      res.status(500).json({ message: 'Failed to fetch KPIs', error: error?.message });
    }
  });

  app.get('/api/dashboard/visuals/time-to-hire', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      console.log('🔍 Time-to-hire endpoint called');
      const { startDate, endDate, department } = req.query;
      console.log('🔍 Query params:', { startDate, endDate, department });
      
      const start = typeof startDate === 'string' ? startDate : undefined;
      const end = typeof endDate === 'string' ? endDate : undefined;
      const dept = typeof department === 'string' ? department : undefined;
      
      let jobs = await storage.getJobs();
      console.log('🔍 Total jobs from storage:', jobs.length);
      
      if (dept) {
        jobs = jobs.filter((j: any) => j.department === dept);
        console.log('🔍 Filtered jobs by department:', jobs.length);
      }
      
      const jobIds = jobs.map((j: any) => j.id);
      console.log('🔍 Job IDs for filtering:', jobIds);
      
      const successfulHires = await db.select().from(applications).where(
        or(eq(applications.status, 'hired'), eq(applications.status, 'onboarded'))
      );
      console.log('🔍 All successful hires from DB:', successfulHires.length);
      
      const filteredApps = successfulHires.filter((app: any) => jobIds.includes(app.jobId) &&
        (!start || new Date(app.hiredAt) >= new Date(start)) &&
        (!end || new Date(app.hiredAt) <= new Date(end)));
      console.log('🔍 Filtered successful hires:', filteredApps.length);
      
      const trend: Record<string, number[]> = {};
      for (const app of filteredApps) {
        if (app.jobId && app.hiredAt && app.appliedAt) {
          const diff = (new Date(app.hiredAt).getTime() - new Date(app.appliedAt).getTime()) / (1000 * 60 * 60 * 24);
          if (!trend[app.jobId]) trend[app.jobId] = [];
          trend[app.jobId].push(diff);
          console.log('🔍 Time to hire for job', app.jobId, ':', diff, 'days');
        }
      }
      
      // Get job titles for the chart labels
      const result = Object.entries(trend).map(([jobId, arr]) => {
        const jobInfo = jobs.find((j: any) => j.id === parseInt(jobId));
        return {
          jobId,
          jobTitle: jobInfo?.title || `Job #${jobId}`,
          avgTimeToHire: arr.reduce((a, b) => a + b, 0) / arr.length
        };
      });
      console.log('🔍 Final time-to-hire result:', result);
      
      res.json(result);
    } catch (error) {
      console.error('❌ Error in time-to-hire:', error);
      res.status(500).json({ message: 'Failed to fetch time-to-hire trend', error: error?.message });
    }
  });

  app.get('/api/dashboard/visuals/source-of-hire', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      console.log('🔍 Source-of-hire endpoint called');
      const { startDate, endDate, department } = req.query;
      console.log('🔍 Query params:', { startDate, endDate, department });
      
      const start = typeof startDate === 'string' ? startDate : undefined;
      const end = typeof endDate === 'string' ? endDate : undefined;
      const dept = typeof department === 'string' ? department : undefined;
      
      let jobs = await storage.getJobs();
      console.log('🔍 Total jobs from storage:', jobs.length);
      
      if (dept) {
        jobs = jobs.filter((j: any) => j.department === dept);
        console.log('🔍 Filtered jobs by department:', jobs.length);
      }
      
      const jobIds = jobs.map((j: any) => j.id);
      console.log('🔍 Job IDs for filtering:', jobIds);
      
      const successfulHires = await db.select().from(applications).where(
        or(eq(applications.status, 'hired'), eq(applications.status, 'onboarded'))
      );
      console.log('🔍 All successful hires from DB:', successfulHires.length);
      console.log('🔍 Hires with source info:', successfulHires.map(h => ({ 
        id: h.id, 
        jobId: h.jobId, 
        source: h.source 
      })));
      
      const filteredApps = successfulHires.filter((app: any) => jobIds.includes(app.jobId) &&
        (!start || new Date(app.hiredAt) >= new Date(start)) &&
        (!end || new Date(app.hiredAt) <= new Date(end)));
      console.log('🔍 Filtered successful hires:', filteredApps.length);
      
      const sourceDist: Record<string, number> = {};
      for (const app of filteredApps) {
        if (app.source) {
          sourceDist[app.source] = (sourceDist[app.source] || 0) + 1;
          console.log('🔍 Source found:', app.source, 'for app', app.id);
        } else {
          console.log('🔍 No source for app', app.id);
        }
      }
      
      console.log('🔍 Final source distribution:', sourceDist);
      res.json(sourceDist);
    } catch (error) {
      console.error('❌ Error in source-of-hire:', error);
      res.status(500).json({ message: 'Failed to fetch source-of-hire', error: error?.message });
    }
  });

  app.get('/api/dashboard/visuals/offer-acceptance', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      console.log('🔍 Offer-acceptance endpoint called');
      const { startDate, endDate, department } = req.query;
      console.log('🔍 Query params:', { startDate, endDate, department });
      
      const start = typeof startDate === 'string' ? startDate : undefined;
      const end = typeof endDate === 'string' ? endDate : undefined;
      const dept = typeof department === 'string' ? department : undefined;
      
      let jobs = await storage.getJobs();
      console.log('🔍 Total jobs from storage:', jobs.length);
      
      if (dept) {
        jobs = jobs.filter((j: any) => j.department === dept);
        console.log('🔍 Filtered jobs by department:', jobs.length);
      }
      
      const jobIds = jobs.map((j: any) => j.id);
      console.log('🔍 Job IDs for filtering:', jobIds);
      
      // Get applications with hired/onboarded status for the selected jobs
      const successfulHires = await db.select().from(applications).where(
        or(eq(applications.status, 'hired'), eq(applications.status, 'onboarded'))
      );
      
      const filteredApps = successfulHires.filter((app: any) => jobIds.includes(app.jobId) &&
        (!start || new Date(app.hiredAt) >= new Date(start)) &&
        (!end || new Date(app.hiredAt) <= new Date(end)));
      
      console.log('🔍 Filtered successful hires:', filteredApps.length);
      
      // Group by job and calculate acceptance rate
      const byJob: Record<string, { total: number, accepted: number }> = {};
      for (const app of filteredApps) {
        if (!byJob[app.jobId]) byJob[app.jobId] = { total: 0, accepted: 0 };
        byJob[app.jobId].total++;
        if (app.status === 'onboarded') byJob[app.jobId].accepted++;
        console.log('🔍 Processing application for job', app.jobId, 'status:', app.status, 'accepted:', app.status === 'onboarded');
      }
      
      console.log('🔍 Applications by job:', byJob);
      
      // Get job titles for the chart labels
      const result = Object.entries(byJob).map(([jobId, { total, accepted }]) => {
        const jobInfo = jobs.find((j: any) => j.id === parseInt(jobId));
        return {
          jobId,
          jobTitle: jobInfo?.title || `Job #${jobId}`,
          acceptanceRate: total > 0 ? (accepted / total) * 100 : null
        };
      });
      
      console.log('🔍 Final offer acceptance result:', result);
      res.json(result);
    } catch (error) {
      console.error('❌ Error in offer-acceptance:', error);
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

  // Skills endpoints
  app.get('/api/skills', authenticateToken, requireRole('candidate'), async (req: any, res) => {
    try {
      const candidate = await storage.getCandidate(req.user.id);
      if (!candidate) {
        return res.status(404).json({ message: 'Candidate not found' });
      }
      
      const skills = await storage.getCandidateSkills(candidate.id);
      res.json(skills);
    } catch (error) {
      console.error('Error fetching skills:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/skills', authenticateToken, requireRole('candidate'), async (req: any, res) => {
    try {
      const candidate = await storage.getCandidate(req.user.id);
      if (!candidate) {
        return res.status(404).json({ message: 'Candidate not found' });
      }
      // Only validate name and expertiseLevel from the request body
      const skillData = skillRequestSchema.parse(req.body);
      const skill = await storage.createSkill({
        ...skillData,
        candidateId: candidate.id
      });
      res.status(201).json(skill);
    } catch (error) {
      console.error('Error creating skill:', error);
      console.error('Error type:', typeof error);
      console.error('Error message:', error instanceof Error ? error.message : error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
      console.error('Request body:', req.body);
      res.status(500).json({ 
        message: 'Server error',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  });

  app.put('/api/skills/:id', authenticateToken, requireRole('candidate'), async (req: any, res) => {
    try {
      const candidate = await storage.getCandidate(req.user.id);
      if (!candidate) {
        return res.status(404).json({ message: 'Candidate not found' });
      }
      
      const skillId = parseInt(req.params.id);
      const validatedData = insertSkillSchema.partial().parse(req.body);
      
      const skill = await storage.updateSkill(skillId, {
        ...validatedData,
        candidateId: candidate.id
      });
      
      if (!skill) {
        return res.status(404).json({ message: 'Skill not found' });
      }
      
      res.json(skill);
    } catch (error) {
      console.error('Error updating skill:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.delete('/api/skills/:id', authenticateToken, requireRole('candidate'), async (req: any, res) => {
    try {
      const candidate = await storage.getCandidate(req.user.id);
      if (!candidate) {
        return res.status(404).json({ message: 'Candidate not found' });
      }
      
      const skillId = parseInt(req.params.id);
      await storage.deleteSkill(skillId);
      
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting skill:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Projects endpoints
  app.get('/api/projects', authenticateToken, requireRole('candidate'), async (req: any, res) => {
    try {
      const candidate = await storage.getCandidate(req.user.id);
      if (!candidate) {
        return res.status(404).json({ message: 'Candidate not found' });
      }

      const projects = await storage.getCandidateProjects(candidate.id);
      res.json(projects);
    } catch (error) {
      console.error('Error fetching projects:', error);
      res.status(500).json({ message: 'Failed to fetch projects' });
    }
  });

  app.post('/api/projects', authenticateToken, requireRole('candidate'), async (req: any, res) => {
    try {
      const candidate = await storage.getCandidate(req.user.id);
      if (!candidate) {
        return res.status(404).json({ message: 'Candidate not found' });
      }

      const validatedData = insertProjectSchema.parse({
        ...req.body,
        candidateId: candidate.id
      });

      const project = await storage.createProject(validatedData);
      
      // Convert description back to array for frontend
      if (project.description && typeof project.description === 'string') {
        try {
          project.description = JSON.parse(project.description);
        } catch (e) {
          project.description = [project.description];
        }
      }
      
      res.status(201).json(project);
    } catch (error) {
      console.error('Error creating project:', error);
      res.status(500).json({ message: 'Failed to create project' });
    }
  });

  app.put('/api/projects/:id', authenticateToken, requireRole('candidate'), async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const candidate = await storage.getCandidate(req.user.id);
      
      if (!candidate) {
        return res.status(404).json({ message: 'Candidate not found' });
      }

      const validatedData = insertProjectSchema.partial().parse(req.body);
      const project = await storage.updateProject(projectId, validatedData, candidate.id);
      
      // Convert description back to array for frontend
      if (project.description && typeof project.description === 'string') {
        try {
          project.description = JSON.parse(project.description);
        } catch (e) {
          project.description = [project.description];
        }
      }
      
      res.json(project);
    } catch (error) {
      console.error('Error updating project:', error);
      res.status(500).json({ message: 'Failed to update project' });
    }
  });

  app.delete('/api/projects/:id', authenticateToken, requireRole('candidate'), async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const candidate = await storage.getCandidate(req.user.id);
      
      if (!candidate) {
        return res.status(404).json({ message: 'Candidate not found' });
      }

      await storage.deleteProject(projectId, candidate.id);
      res.json({ message: 'Project deleted successfully' });
    } catch (error) {
      console.error('Error deleting project:', error);
      res.status(500).json({ message: 'Failed to delete project' });
    }
  });

  app.post('/api/assessments/:attemptId/answers', authenticateToken, requireRole('candidate'), async (req: any, res) => {
    try {
      const attemptId = parseInt(req.params.attemptId);
      const { questionId, answer } = req.body;
      
      // Validate the attempt belongs to the current user
      const candidate = await storage.getCandidate(req.user.id);
      if (!candidate) {
        return res.status(404).json({ message: 'Candidate not found' });
      }
      
      const attempt = await storage.findAssessmentAttempt(attemptId);
      if (!attempt || attempt.candidateId !== candidate.id) {
        return res.status(404).json({ message: 'Assessment attempt not found' });
      }
      
      // Save the answer
      await storage.saveAssessmentAnswer(attemptId, questionId, answer);
      
      res.json({ message: 'Answer saved successfully' });
    } catch (error) {
      console.error('Error saving assessment answer:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Debug endpoint for assessment troubleshooting
  app.get('/api/debug/assessment/:attemptId', authenticateToken, requireRole('admin'), async (req: any, res) => {
    console.log(`🔍 [DEBUG ROUTE] Assessment debug request received`);
    console.log(`📊 [DEBUG ROUTE] Request details:`, {
      attemptId: req.params.attemptId,
      user: req.user?.id
    });
    
    try {
      const attemptId = parseInt(req.params.attemptId);
      console.log(`🔍 [DEBUG ROUTE] Parsed attempt ID: ${attemptId}`);
      
      if (isNaN(attemptId)) {
        console.error(`❌ [DEBUG ROUTE] Invalid attempt ID: ${req.params.attemptId}`);
        return res.status(400).json({ message: 'Invalid attempt ID' });
      }
      
      console.log(`📞 [DEBUG ROUTE] Calling storage.debugAssessmentData with attemptId: ${attemptId}`);
      const debugData = await storage.debugAssessmentData(attemptId);
      
      console.log(`✅ [DEBUG ROUTE] Debug data retrieved successfully`);
      res.json(debugData);
    } catch (error: unknown) {
      console.error(`❌ [DEBUG ROUTE] Error getting debug data:`, error);
            
      
      res.status(500).json({ message: 'Server error' });
      console.error(`❌ [DEBUG ROUTE] Error type:`, typeof error);
      console.error(`❌ [DEBUG ROUTE] Error message:`, error instanceof Error ? error.message : 'Unknown error');
      console.error(`❌ [DEBUG ROUTE] Error stack:`, error instanceof Error ? error.stack : 'No stack available');
      
      const errorMessage = error instanceof Error ? error.message : 'Server error';
      const errorDetails = error instanceof Error ? error.stack : 'No details available';
      
      res.status(500).json({ 
        message: 'Server error', 
        error: errorMessage,
        details: errorDetails
      });
    }
  });

  // Test endpoint to check candidates with resume text
  app.get('/api/debug/job/:jobId/resume-status', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const applications = await storage.getApplicationsByJob(jobId);
      const job = await storage.getJob(jobId);
      
      const debugData = [];
      
      for (const application of applications) {
        const profile = await storage.getCandidateWithProfile(application.candidateId);
        debugData.push({
          applicationId: application.id,
          candidateId: application.candidateId,
          candidateName: profile ? `${profile.firstName} ${profile.lastName}` : 'Unknown',
          hasResumeText: !!profile?.resumeText,
          resumeTextLength: profile?.resumeText?.length || 0,
          resumeTextPreview: profile?.resumeText?.substring(0, 100) || 'No resume text',
          hasResumeUrl: !!profile?.resumeUrl,
          resumeUrl: profile?.resumeUrl || 'No resume URL'
        });
      }
      
      res.json({
        jobId,
        jobTitle: job?.title || 'Unknown',
        totalApplications: applications.length,
        applicationsWithResumeText: debugData.filter(d => d.hasResumeText).length,
        applicationsWithoutResumeText: debugData.filter(d => !d.hasResumeText).length,
        candidatesWithoutResume: debugData.filter(d => !d.hasResumeText).map(d => d.candidateId), // Add this line
        debugData
      });
    } catch (error) {
      console.error('Debug endpoint error:', error);
      res.status(500).json({ message: 'Debug endpoint failed', error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Extract resume text from existing resume (individual)
  app.post('/api/extract-resume-text', authenticateToken, async (req: any, res) => {
    try {
      const candidate = await storage.getCandidate(req.user.id);
      if (!candidate) {
        return res.status(404).json({ message: 'Profile not found' });
      }

      if (!candidate.resumeUrl) {
        return res.status(400).json({ message: 'No resume uploaded' });
      }

      const resumePath = `./uploads/${candidate.resumeUrl.split('/').pop()}`;
      
      // Call Python script to extract resume text (optional)
      let resumeText = '';
      try {
        // Check if Python is available
        const { spawn } = await import('child_process');
        const python = spawn(getPythonCommand(), ['--version'], { stdio: 'pipe' });
        
        await new Promise((resolve) => {
          python.on('close', (code) => {
            if (code === 0) {
              // Python is available, proceed with text extraction
              const extractPython = spawn(getPythonCommand(), [
                './server/resume_parser/extract_resume_text.py',
                resumePath
              ], {
                env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
              });
              
              let output = '';
              let errorOutput = '';
              extractPython.stdout.on('data', (data) => {
                output += data.toString();
              });
              extractPython.stderr.on('data', (data) => {
                errorOutput += data.toString();
              });
              
              extractPython.on('close', (extractCode) => {
                if (extractCode === 0) {
                  resumeText = output;
                  console.log('Resume text extracted successfully');
                } else {
                  console.error('Resume parsing error:', errorOutput);
                  resumeText = '';
                }
                resolve(null);
              });
            } else {
              // Python not available, return error
              console.log('Python not available for resume text extraction');
              resumeText = '';
              resolve(null);
            }
          });
        });
      } catch (err) {
        console.error('Failed to check Python or parse resume:', err);
        resumeText = '';
      }

      if (resumeText) {
        await storage.updateCandidate(candidate.id, { resumeText });
        res.json({ resumeText, message: 'Resume text extracted successfully' });
      } else {
        res.status(400).json({ message: 'Failed to extract resume text' });
      }
    } catch (error) {
      console.error('Extract resume text error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Batch extract resume text for all candidates in a job
  app.post('/api/jobs/:jobId/extract-resume-text', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const { candidateIds } = req.body; // Support selective extraction by candidate IDs
      
      let applications;
      if (candidateIds && Array.isArray(candidateIds) && candidateIds.length > 0) {
        // Extract only for specific candidates
        console.log(`Selective extraction requested for ${candidateIds.length} candidates:`, candidateIds);
        applications = await storage.getApplicationsByJob(jobId);
        applications = applications.filter(app => candidateIds.includes(app.candidateId));
      } else {
        // Extract for all candidates in the job
        applications = await storage.getApplicationsByJob(jobId);
      }
      
      console.log(`Processing ${applications.length} applications for resume text extraction`);
      
      let processed = 0;
      let extracted = 0;
      let failed = 0;
      
      for (const application of applications) {
        const profile = await storage.getCandidateWithProfile(application.candidateId);
        
        console.log(`Processing candidate ${application.candidateId} (${profile?.firstName} ${profile?.lastName})`);
        
        if (!profile || !profile.resumeUrl) {
          console.log(`Skipping candidate ${application.candidateId}: No profile or resume URL`);
          failed++;
          continue;
        }
        
        if (profile.resumeText) {
          console.log(`Skipping candidate ${application.candidateId}: Already has resume text (${profile.resumeText.length} chars)`);
          processed++;
          continue; // Already has resume text
        }
        
        console.log(`Extracting resume text for candidate ${application.candidateId} from URL: ${profile.resumeUrl}`);
        
        try {
          // Check if Python is available first
          const { spawn } = await import('child_process');
          const pythonCheck = spawn(getPythonCommand(), ['--version'], { stdio: 'pipe' });
          
          await new Promise((resolve, reject) => {
            pythonCheck.on('close', (code) => {
              if (code === 0) {
                // Python is available, proceed with extraction
                const py = spawn(getPythonCommand(), ['server/resume_parser/extract_resume_text.py'], {
                  env: { ...process.env }
                });
                
                let output = '';
                let errorOutput = '';
                
                py.stdout.on('data', (data: any) => { output += data.toString(); });
                py.stderr.on('data', (data: any) => { errorOutput += data.toString(); });
                
                const input = {
                  resume_url: profile.resumeUrl
                };
                
                py.stdin.write(JSON.stringify(input));
                py.stdin.end();
                
                const timeout = setTimeout(() => {
                  py.kill();
                  reject(new Error('Resume extraction timed out'));
                }, 30000);
                
                py.on('close', (code) => {
                  clearTimeout(timeout);
                  if (code !== 0) {
                    reject(new Error(`Resume extraction failed with code ${code}`));
                  } else {
                    resolve(null);
                  }
                });
              } else {
                // Python not available, skip extraction
                console.log(`Python not available, skipping resume text extraction for candidate ${profile.id}`);
                resolve(null);
              }
            });
          });
          
          let resumeText = '';
          try {
            const result = JSON.parse(output);
            resumeText = result.resume_text || '';
          } catch (e) {
            resumeText = output.trim();
          }
          
          if (resumeText && resumeText.length > 0) {
            await storage.updateCandidate(profile.id, { resumeText });
            extracted++;
          } else {
            failed++;
          }
          
        } catch (error) {
          console.error(`Failed to extract resume text for candidate ${profile.id}:`, error);
          failed++;
        }
        
        processed++;
      }
      
      res.json({
        summary: {
          total: applications.length,
          processed,
          extracted,
          failed
        }
      });
      
    } catch (error) {
      console.error('Batch resume extraction error:', error);
      res.status(500).json({ 
        message: 'Failed to batch extract resume text', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Google OAuth callback route for Gmail API
  app.get('/api/auth/google/callback', async (req, res) => {
    try {
      const { code } = req.query;
      
      if (!code) {
        return res.status(400).json({ 
          message: 'Authorization code is required',
          error: 'Missing authorization code'
        });
      }

      console.log('🔐 Google OAuth callback received with code');
      
      // Import the gmailService to get tokens
      const { getTokensFromCode } = await import('./gmailService');
      
      try {
        const tokens = await getTokensFromCode(code as string);
        
        console.log('✅ Tokens received successfully');
        
        // Return success with instructions
        res.json({
          success: true,
          message: 'Authorization successful!',
          instructions: 'Copy the refresh token below and add it to your .env file',
          refresh_token: tokens.refresh_token,
          env_setting: `GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`
        });
        
      } catch (tokenError: any) {
        console.error('❌ Token exchange failed:', tokenError);
        res.status(500).json({
          success: false,
          message: 'Failed to exchange authorization code for tokens',
          error: tokenError.message,
          instructions: 'Please try the authorization process again'
        });
      }
      
    } catch (error: any) {
      console.error('❌ OAuth callback error:', error);
      res.status(500).json({
        success: false,
        message: 'OAuth callback processing failed',
        error: error.message
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
