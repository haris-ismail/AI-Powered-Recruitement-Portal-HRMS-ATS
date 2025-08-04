import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';

const app = express();

// Basic CORS
app.use(cors({
  origin: ['http://localhost:5000', 'http://localhost:3000'],
  credentials: true
}));

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is running!' });
});

// Serve static files
app.use(express.static('client'));

// Fallback route
app.get('*', (req, res) => {
  res.sendFile('client/index.html', { root: '.' });
});

const port = 5000;
app.listen(port, () => {
  console.log(`Test server running on port ${port}`);
  console.log(`Database URL: ${process.env.DATABASE_URL ? 'Set' : 'Not set'}`);
}); 