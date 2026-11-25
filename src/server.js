const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const client = require('prom-client');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;
const APP_VERSION = process.env.APP_VERSION || '1.0.0';
const RELEASE_TRACK = process.env.RELEASE_TRACK || 'stable'; // stable or canary

// 1. Security & Logging Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

// 2. Prometheus Observability & Metrics Setup
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ prefix: 'node_app_' });

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests processed',
  labelNames: ['method', 'route', 'status', 'release_track']
});

const httpRequestDurationSeconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Histogram of HTTP request durations in seconds',
  labelNames: ['method', 'route', 'status', 'release_track'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5]
});

// Middleware to track latency and metrics
app.use((req, res, next) => {
  const start = process.hrtime();
  res.on('finish', () => {
    const diff = process.hrtime(start);
    const duration = diff[0] + diff[1] / 1e9;
    const route = req.route ? req.route.path : req.path;
    httpRequestsTotal.inc({ method: req.method, route, status: res.statusCode, release_track: RELEASE_TRACK });
    httpRequestDurationSeconds.observe({ method: req.method, route, status: res.statusCode, release_track: RELEASE_TRACK }, duration);
  });
  next();
});

// In-memory data store for demonstration
let tasks = [
  { id: 1, title: 'Setup GitHub Actions CI/CD Pipeline', status: 'completed' },
  { id: 2, title: 'Implement Trivy & SonarQube DevSecOps scanning', status: 'completed' },
  { id: 3, title: 'Deploy Kubernetes Cluster with Terraform', status: 'completed' },
  { id: 4, title: 'Configure Canary Deployment with Ingress Traffic Shifting', status: 'active' }
];

// 3. API Routes

// Root metadata route
app.get('/', (req, res) => {
  res.status(200).json({
    project: 'Enterprise DevOps Automation Platform',
    status: 'ONLINE',
    version: APP_VERSION,
    track: RELEASE_TRACK,
    timestamp: new Date().toISOString()
  });
});

// Liveness probe (Kubernetes kubelet check)
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() });
});

// Readiness probe (Traffic routing check)
app.get('/ready', (req, res) => {
  // Can check DB connection or cache readiness here
  res.status(200).json({ ready: true, database: 'CONNECTED', track: RELEASE_TRACK });
});

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  } catch (err) {
    res.status(500).end(err);
  }
});

// REST API Resource: Tasks
app.get('/api/v1/tasks', (req, res) => {
  res.status(200).json({
    success: true,
    count: tasks.length,
    data: tasks,
    served_by_track: RELEASE_TRACK
  });
});

app.post('/api/v1/tasks', (req, res) => {
  const { title, status } = req.body;
  if (!title) {
    return res.status(400).json({ success: false, error: 'Title is required' });
  }
  const newTask = {
    id: tasks.length + 1,
    title,
    status: status || 'pending',
    created_at: new Date().toISOString()
  };
  tasks.push(newTask);
  res.status(201).json({ success: true, data: newTask });
});

// Graceful Shutdown Handler
let server;
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(PORT, () => {
    console.log(`[INFO] DevOps Enterprise Service running on port ${PORT}`);
    console.log(`[INFO] Version: ${APP_VERSION} | Track: ${RELEASE_TRACK}`);
  });
}

const gracefulShutdown = () => {
  console.log('[INFO] Received termination signal. Closing server gracefully...');
  if (server) {
    server.close(() => {
      console.log('[INFO] HTTP server closed. Process terminating.');
      process.exit(0);
    });
  }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

module.exports = app;
