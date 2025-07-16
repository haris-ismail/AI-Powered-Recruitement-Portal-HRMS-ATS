import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import { insertUserSchema, insertCandidateSchema, insertEducationSchema, insertExperienceSchema, insertJobSchema, insertJobTemplateSchema, insertApplicationSchema, insertEmailTemplateSchema, insertSkillSchema } from "@shared/schema";
import { z } from "zod";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

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

// Middleware to verify JWT token
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
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
      const { email, password } = req.body;
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({ 
        token, 
        user: { 
          id: user.id, 
          email: user.email, 
          role: user.role 
        } 
      });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/auth/register', async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
        role: 'candidate'
      });

      // Check CNIC uniqueness
      const cnic = req.body.cnic;
      if (!cnic) {
        return res.status(400).json({ message: 'CNIC is required' });
      }
      const existingCnic = await storage.getCandidateByCnic(cnic);
      if (existingCnic) {
        return res.status(400).json({ message: 'CNIC already exists' });
      }

      // Create candidate profile
      await storage.createCandidate({
        userId: user.id,
        cnic
      });

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.status(201).json({ 
        token, 
        user: { 
          id: user.id, 
          email: user.email, 
          role: user.role 
        } 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid input', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error' });
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
      await storage.updateCandidate(candidate.id, { resumeUrl });

      res.json({ resumeUrl });
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
    } catch (error) {
      res.status(500).json({ message: 'Failed to upload profile picture' });
    }
  });

  // Job routes
  app.get('/api/jobs', async (req, res) => {
    try {
      const jobs = await storage.getJobs();
      res.json(jobs);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/jobs', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      const jobData = insertJobSchema.parse(req.body);
      const job = await storage.createJob(jobData);
      res.status(201).json(job);
    } catch (error) {
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
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/job-templates', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      const templateData = insertJobTemplateSchema.parse(req.body);
      const template = await storage.createJobTemplate(templateData);
      res.status(201).json(template);
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
    } catch (error) {
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
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/applications', authenticateToken, requireRole('candidate'), async (req: any, res) => {
    try {
      const candidate = await storage.getCandidate(req.user.id);
      if (!candidate) {
        return res.status(404).json({ message: 'Profile not found' });
      }

      const applicationData = insertApplicationSchema.parse({
        ...req.body,
        candidateId: candidate.id
      });

      const application = await storage.createApplication(applicationData);
      res.status(201).json(application);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid input', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.put('/api/applications/:id', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      const applicationData = insertApplicationSchema.partial().parse(req.body);
      const application = await storage.updateApplication(parseInt(req.params.id), applicationData);
      res.json(application);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid input', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Email templates
  app.get('/api/email-templates', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      const templates = await storage.getEmailTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/email-templates', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      const templateData = insertEmailTemplateSchema.parse(req.body);
      const template = await storage.createEmailTemplate(templateData);
      res.status(201).json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid input', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Admin analytics
  app.get('/api/admin/stats', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      const stats = await storage.getJobStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
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
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Get candidate by ID (for admin email compose, etc.)
  app.get('/api/candidates/:id', authenticateToken, requireRole('admin'), async (req, res) => {
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
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Candidate Notes (Admin only)
  app.get('/api/candidates/:id/notes', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      const candidateId = parseInt(req.params.id);
      const notes = await storage.getCandidateNotes(candidateId);
      res.json(notes);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
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
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.put('/api/candidates/:id/notes/:noteId', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      const noteId = parseInt(req.params.noteId);
      const { note, score } = req.body;
      const updated = await storage.updateCandidateNote(noteId, { note, score });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.delete('/api/candidates/:id/notes/:noteId', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      const noteId = parseInt(req.params.noteId);
      await storage.deleteCandidateNote(noteId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Candidate Reviews (Admin/Panel only)
  app.get('/api/applications/:id/reviews', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      const applicationId = parseInt(req.params.id);
      const stage = req.query.stage as string | undefined;
      const reviews = await storage.getCandidateReviews(applicationId, stage);
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
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
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.put('/api/applications/:id/reviews/:reviewId', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      const reviewId = parseInt(req.params.reviewId);
      const { stage, rating, feedback } = req.body;
      const updated = await storage.updateCandidateReview(reviewId, { stage, rating, feedback });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.delete('/api/applications/:id/reviews/:reviewId', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      const reviewId = parseInt(req.params.reviewId);
      await storage.deleteCandidateReview(reviewId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Skills routes
  app.get('/api/skills', authenticateToken, async (req: any, res) => {
    try {
      const candidate = await storage.getCandidate(req.user.id);
      if (!candidate) {
        return res.status(404).json({ message: 'Profile not found' });
      }
      const skills = await storage.getCandidateSkills(candidate.id);
      res.json(skills);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/skills', authenticateToken, async (req: any, res) => {
    try {
      const candidate = await storage.getCandidate(req.user.id);
      if (!candidate) {
        return res.status(404).json({ message: 'Profile not found' });
      }
      const skillData = insertSkillSchema.parse({ ...req.body, candidateId: candidate.id });
      const skill = await storage.createSkill(skillData);
      res.status(201).json(skill);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid input', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.put('/api/skills/:id', authenticateToken, async (req: any, res) => {
    try {
      const skillData = insertSkillSchema.partial().parse(req.body);
      const skill = await storage.updateSkill(parseInt(req.params.id), skillData);
      res.json(skill);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid input', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.delete('/api/skills/:id', authenticateToken, async (req: any, res) => {
    try {
      await storage.deleteSkill(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Serve uploaded files
  app.use('/uploads', (await import('express')).static('uploads'));

  const httpServer = createServer(app);
  return httpServer;
}
