const http = require('http');

const NUM_REQUESTS = 100;
const ATTEMPT_ID = 1; // Use a real attemptId in real test
const ANSWERS = { 1: 'A' };

function submitAssessment(attemptId, cb) {
  const data = JSON.stringify({ answers: ANSWERS });
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: `/api/assessments/${attemptId}/submit`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length,
      'Authorization': 'Bearer <TOKEN>' // Replace with real token
    }
  };
  const req = http.request(options, res => {
    res.on('data', () => {});
    res.on('end', cb);
  });
  req.on('error', cb);
  req.write(data);
  req.end();
}

let completed = 0;
const start = Date.now();
for (let i = 0; i < NUM_REQUESTS; i++) {
  submitAssessment(ATTEMPT_ID, () => {
    completed++;
    if (completed === NUM_REQUESTS) {
      const duration = Date.now() - start;
      console.log(`All ${NUM_REQUESTS} submissions completed in ${duration}ms`);
    }
  });
} 