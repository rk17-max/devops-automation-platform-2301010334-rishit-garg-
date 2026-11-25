const request = require('supertest');
const app = require('../src/server');

describe('DevOps Enterprise API Endpoints Testing', () => {
  it('GET / should return service info and 200 OK', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('status', 'ONLINE');
    expect(res.body).toHaveProperty('version');
  });

  it('GET /healthz should return 200 OK for K8s liveness probe', async () => {
    const res = await request(app).get('/healthz');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('status', 'UP');
  });

  it('GET /ready should return 200 OK for K8s readiness probe', async () => {
    const res = await request(app).get('/ready');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('ready', true);
  });

  it('GET /metrics should expose Prometheus formatted metrics', async () => {
    const res = await request(app).get('/metrics');
    expect(res.statusCode).toEqual(200);
    expect(res.text).toContain('node_app_');
    expect(res.text).toContain('http_requests_total');
  });

  it('GET /api/v1/tasks should list all items', async () => {
    const res = await request(app).get('/api/v1/tasks');
    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('POST /api/v1/tasks should validate input and create task', async () => {
    const res = await request(app)
      .post('/api/v1/tasks')
      .send({ title: 'New DevOps Feature', status: 'pending' });
    expect(res.statusCode).toEqual(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('New DevOps Feature');
  });
});
