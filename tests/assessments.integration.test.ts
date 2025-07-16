import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../server/index'; // Adjust import as needed

describe('Assessment API Integration', () => {
  let token = '';
  let attemptId = 0;

  it('logs in as candidate', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'candidate@example.com', password: 'password' });
    expect(res.status).toBe(200);
    token = res.body.token;
  });

  it('starts an assessment', async () => {
    const res = await request(app)
      .get('/api/assessments/1/start')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    attemptId = res.body.attemptId;
  });

  it('submits answers', async () => {
    const res = await request(app)
      .post(`/api/assessments/${attemptId}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .send({ answers: { 1: 'A' } });
    expect(res.status).toBe(200);
    expect(res.body.status).toBeDefined();
  });

  it('gets assessment results', async () => {
    const res = await request(app)
      .get(`/api/assessments/${attemptId}/results`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('score');
  });
}); 