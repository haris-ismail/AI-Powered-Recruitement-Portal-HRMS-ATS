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
      // Extract user data (email, password) and candidate data (cnic) separately
      const { email, password, cnic } = req.body;
      
      // Validate user data
      const userData = insertUserSchema.parse({ email, password });
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
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
      
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
        role: 'candidate'
      });

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
    } catch (error: any) {
      console.error('Registration error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid input', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error', details: error.message });
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

  app.put('/api/jobs/:id', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      const jobData = insertJobSchema.partial().parse(req.body);
      const job = await storage.updateJob(parseInt(req.params.id), jobData);
      res.json(job);
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
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Candidate Notes (Admin only)
  app.get('/api/candidates/:id/notes', authenticateToken, requireRole('admin'), async (req: any, res) => {
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

  app.delete('/api/candidates/:id/notes/:noteId', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      const noteId = parseInt(req.params.noteId);
      await storage.deleteCandidateNote(noteId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Candidate Reviews (Admin/Panel only)
  app.get('/api/applications/:id/reviews', authenticateToken, requireRole('admin'), async (req: any, res) => {
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

  app.delete('/api/applications/:id/reviews/:reviewId', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      const reviewId = parseInt(req.params.reviewId);
      await storage.deleteCandidateReview(reviewId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // --- Assessment Categories ---
  app.get('/api/assessment-categories', authenticateToken, async (req: any, res) => {
    try {
      const categories = await storage.getAssessmentCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  app.post('/api/assessment-categories', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      const category = await storage.createAssessmentCategory(req.body);
      res.status(201).json(category);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // --- Assessment Templates ---
  app.get('/api/assessment-templates', authenticateToken, async (req: any, res) => {
    try {
      const templates = await storage.getAssessmentTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  app.post('/api/assessment-templates', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      const template = await storage.createAssessmentTemplate(req.body);
      res.status(201).json(template);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  app.put('/api/assessment-templates/:id', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      const template = await storage.updateAssessmentTemplate(parseInt(req.params.id), req.body);
      res.json(template);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  app.delete('/api/assessment-templates/:id', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      await storage.deleteAssessmentTemplate(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // --- Assessment Questions ---
  app.get('/api/assessment-templates/:id/questions', authenticateToken, async (req: any, res) => {
    try {
      const questions = await storage.getAssessmentQuestions(parseInt(req.params.id));
      res.json(questions);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  app.post('/api/assessment-templates/:id/questions', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      const question = await storage.createAssessmentQuestion(parseInt(req.params.id), req.body);
      res.status(201).json(question);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  app.put('/api/assessment-questions/:id', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      const question = await storage.updateAssessmentQuestion(parseInt(req.params.id), req.body);
      res.json(question);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  app.delete('/api/assessment-questions/:id', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      await storage.deleteAssessmentQuestion(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // --- Job Assessments ---
  app.get('/api/jobs/:id/assessments', authenticateToken, async (req: any, res) => {
    try {
      const assessments = await storage.getJobAssessments(parseInt(req.params.id));
      res.json(assessments);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  app.post('/api/jobs/:id/assessments', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      const assessment = await storage.createJobAssessment(parseInt(req.params.id), req.body);
      res.status(201).json(assessment);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  app.delete('/api/jobs/:id/assessments/:assessmentId', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      await storage.deleteJobAssessment(parseInt(req.params.assessmentId));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // --- Candidate Flow ---
  app.get('/api/candidate/assessments/pending', authenticateToken, requireRole('candidate'), async (req: any, res) => {
    try {
      const pending = await storage.getPendingAssessments(req.user.id);
      res.json(pending);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  app.get('/api/assessments/:templateId/start', authenticateToken, requireRole('candidate'), async (req: any, res) => {
    try {
      const result = await storage.startAssessment(parseInt(req.params.templateId), req.user.id, req.query.jobId ? parseInt(req.query.jobId as string) : undefined);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  app.post('/api/assessments/:attemptId/submit', authenticateToken, requireRole('candidate'), async (req: any, res) => {
    try {
      const result = await storage.submitAssessment(parseInt(req.params.attemptId), req.body);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  app.get('/api/assessments/:attemptId/results', authenticateToken, async (req: any, res) => {
    try {
      const result = await storage.getAssessmentResults(parseInt(req.params.attemptId));
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // --- Admin View ---
  app.get('/api/admin/assessments/results', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      const results = await storage.getAllAssessmentResults();
      res.json(results);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  app.get('/api/admin/candidates/:candidateId/assessments', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      const results = await storage.getCandidateAssessments(parseInt(req.params.candidateId));
      res.json(results);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // --- Assessment Analytics ---
  app.get('/api/admin/assessment-analytics', authenticateToken, requireRole('admin'), async (req: any, res) => {
    try {
      const analytics = await storage.getAssessmentAnalytics();
      res.json(analytics);
    } catch (error) {
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

  const httpServer = createServer(app);
  return httpServer;
}
