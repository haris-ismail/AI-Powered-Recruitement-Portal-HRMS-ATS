import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../server/index'; // Adjust import as needed

describe('Assessment E2E Flow', () => {
  let adminToken = '';
  let candidateToken = '';
  let templateId = 0;
  let jobId = 0;
  let attemptId = 0;

  it('logs in as admin', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'admin@example.com', password: 'adminpass' });
    expect(res.status).toBe(200);
    adminToken = res.body.token;
  });

  it('creates assessment template', async () => {
    const res = await request(app)
      .post('/api/assessment-templates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'E2E Test', description: '', categoryId: 1, durationMinutes: 10, passingScore: 1, isActive: true, createdBy: 1 });
    expect(res.status).toBe(201);
    templateId = res.body.id;
  });

  it('assigns assessment to job', async () => {
    // Assume jobId 1 exists
    jobId = 1;
    const res = await request(app)
      .post(`/api/jobs/${jobId}/assessments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ templateId, isRequired: true });
    expect(res.status).toBe(201);
  });

  it('logs in as candidate', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'candidate@example.com', password: 'password' });
    expect(res.status).toBe(200);
    candidateToken = res.body.token;
  });

  it('starts and submits assessment', async () => {
    const start = await request(app)
      .get(`/api/assessments/${templateId}/start`)
      .set('Authorization', `Bearer ${candidateToken}`);
    expect(start.status).toBe(200);
    attemptId = start.body.attemptId;
    const submit = await request(app)
      .post(`/api/assessments/${attemptId}/submit`)
      .set('Authorization', `Bearer ${candidateToken}`)
      .send({ answers: { 1: 'A' } });
    expect(submit.status).toBe(200);
  });

  it('admin views assessment results', async () => {
    const res = await request(app)
      .get('/api/admin/assessments/results')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
}); 