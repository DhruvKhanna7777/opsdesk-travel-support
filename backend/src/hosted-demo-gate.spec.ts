import express from 'express';
import request from 'supertest';
import { hostedDemoGate } from './hosted-demo-gate';

describe('hosted demo gate', () => {
  const secret = 'a'.repeat(64);
  const app = express();
  app.use(hostedDemoGate(secret));
  app.get('/health/ready', (_req, res) => res.sendStatus(200));
  app.get('/health/worker', (_req, res) => res.sendStatus(200));
  app.post('/auth/register', (_req, res) => res.sendStatus(200));
  app.post('/auth/login', (_req, res) => res.sendStatus(200));
  app.get('/ops/workspace', (_req, res) => res.sendStatus(200));

  it('allows only health checks without a secret', async () => {
    for (const path of ['/health/ready', '/health/worker'])
      await request(app).get(path).expect(200);
    await request(app).get('/ops/workspace').expect(401);
    await request(app).post('/auth/login').expect(401);
    await request(app)
      .get('/ops/workspace')
      .set('x-opsdesk-demo-gate', 'wrong')
      .expect(401);
  });

  it('accepts the web server secret and disables registration', async () => {
    await request(app)
      .get('/ops/workspace')
      .set('x-opsdesk-demo-gate', secret)
      .expect(200);
    await request(app)
      .post('/auth/register')
      .set('x-opsdesk-demo-gate', secret)
      .expect(404);
  });
});
