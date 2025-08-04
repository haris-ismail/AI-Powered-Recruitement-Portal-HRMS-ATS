import dotenv from 'dotenv';
dotenv.config();
import { fileURLToPath } from 'url';
import path from 'path';
import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { db } from "./db";

const app = express();

// CORS configuration for cookie handling
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] 
    : ['http://localhost:5000', 'http://localhost:3000'],
  credentials: true, // Required for cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
}));

// Cookie parser middleware
app.use(cookieParser());

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Add request timeout handling
app.use((req, res, next) => {
  // Set timeout for all requests
  req.setTimeout(30000); // 30 seconds
  res.setTimeout(30000); // 30 seconds
  
  // Handle request abort
  req.on('aborted', () => {
    console.log('Request aborted:', req.method, req.path);
  });
  
  // Handle response close
  res.on('close', () => {
    if (!res.headersSent) {
      console.log('Response closed before sending headers:', req.method, req.path);
    }
  });
  
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Start the server
(async () => {
  try {
    // Register API routes first
    const server = await registerRoutes(app);
    
    let vite: any = null;
    
    if (process.env.NODE_ENV === 'production') {
      const staticPath = path.join(process.cwd(), 'dist/public');
      
      // Serve static files in production
      app.use(express.static(staticPath));
      
      // Handle SPA fallback - return index.html for all other routes
      app.get('*', (req, res) => {
        res.sendFile(path.join(staticPath, 'index.html'));
      });
    } else {
      // In development, use Vite's middleware
      try {
        const { createServer } = await import('vite');
        vite = await createServer({
          appType: 'spa',
          root: path.join(process.cwd(), 'client'),
          configFile: path.join(process.cwd(), 'vite.config.ts'),
          server: {
            middlewareMode: true,
            hmr: {
              port: 24678, // Use a different port for HMR
            },
          },
        });
        
        // Use vite's connect instance to handle requests
        app.use(vite.middlewares);
        
        // Serve the Vite dev server for all other routes
        app.use('*', async (req, res, next) => {
          try {
            // Skip API routes
            if (req.originalUrl.startsWith('/api')) {
              return next();
            }
            
            // Let Vite handle the request
            vite.middlewares.handle(req, res, next);
          } catch (e) {
            // If an error occurs, let Vite fix the stack trace
            vite.ssrFixStacktrace(e as Error);
            next(e);
          }
        });
      } catch (viteError) {
        console.error('Failed to setup Vite:', viteError);
        // Fallback to static file serving if Vite fails
        app.use(express.static(path.join(process.cwd(), 'client')));
        app.get('*', (req, res) => {
          res.sendFile(path.join(process.cwd(), 'client/index.html'));
        });
      }
    }

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      console.error('Server error:', err);
    });

    // ALWAYS serve the app on port 5000
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = 5000;
    server.listen({
      port,
      host: "0.0.0.0"
      // reusePort: true, // Removed for Windows compatibility
    }, () => {
      log(`serving on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();
