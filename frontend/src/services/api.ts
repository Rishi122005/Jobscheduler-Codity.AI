import axios from 'axios';

// Local Mock Storage state in memory
const MOCK_USERS = [
  { id: 'user-1', email: 'admin@scheduler.com', firstName: 'Admin', lastName: 'User' }
];

const MOCK_ORGS = [
  { id: 'org-1', name: 'Global Tech Corp', slug: 'global-tech-corp', role: 'OWNER' }
];

const MOCK_PROJECTS = [
  { id: 'proj-1', organizationId: 'org-1', name: 'Billing Platform', description: 'Core financial transactions queue', createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString() },
  { id: 'proj-2', organizationId: 'org-1', name: 'User Notifications Service', description: 'SMS and email notifications pipeline', createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString() }
];

const MOCK_RETRY_POLICIES = [
  { id: 'policy-1', name: 'Exponential Backoff', type: 'EXPONENTIAL', maxRetries: 3, baseDelayMs: 2000 },
  { id: 'policy-2', name: 'Immediate Retry', type: 'FIXED', maxRetries: 2, baseDelayMs: 500 }
];

export const MOCK_QUEUES = [
  { id: 'queue-1', projectId: 'proj-1', name: 'payments-queue', description: 'Processes user credit card billing requests', concurrencyLimit: 3, isPaused: false, createdAt: new Date().toISOString() },
  { id: 'queue-2', projectId: 'proj-1', name: 'refunds-queue', description: 'Processes automated customer refunds', concurrencyLimit: 1, isPaused: false, createdAt: new Date().toISOString() },
  { id: 'queue-3', projectId: 'proj-2', name: 'email-dispatch', description: 'SMTP email notifications', concurrencyLimit: 5, isPaused: false, createdAt: new Date().toISOString() }
];

export let MOCK_JOBS = [
  { id: 'job-1', queueId: 'queue-1', projectId: 'proj-1', status: 'COMPLETED', priority: 10, payload: { type: 'processPayment', amount: 150, userId: 'usr-901' }, runAt: new Date(Date.now() - 30000).toISOString(), maxRetries: 3, currentRetry: 0, createdById: 'user-1', createdAt: new Date(Date.now() - 35000).toISOString(), updatedAt: new Date(Date.now() - 25000).toISOString(), logs: [{ message: 'Claimed by worker-acer-4011', level: 'INFO', timestamp: new Date(Date.now() - 29000).toISOString() }, { message: 'Processing payment of $150...', level: 'INFO', timestamp: new Date(Date.now() - 28000).toISOString() }, { message: 'Job executed successfully in 4000ms', level: 'INFO', timestamp: new Date(Date.now() - 25000).toISOString() }], executions: [{ id: 'exec-1', status: 'COMPLETED', workerId: 'work-1', startedAt: new Date(Date.now() - 29000).toISOString(), finishedAt: new Date(Date.now() - 25000).toISOString(), durationMs: 4000 }] },
  { id: 'job-2', queueId: 'queue-1', projectId: 'proj-1', status: 'RUNNING', priority: 5, payload: { type: 'processPayment', amount: 95, userId: 'usr-384' }, runAt: new Date().toISOString(), maxRetries: 3, currentRetry: 0, createdById: 'user-1', createdAt: new Date(Date.now() - 5000).toISOString(), updatedAt: new Date().toISOString(), logs: [{ message: 'Claimed by worker-acer-4011', level: 'INFO', timestamp: new Date(Date.now() - 4000).toISOString() }, { message: 'Processing payment of $95...', level: 'INFO', timestamp: new Date(Date.now() - 2000).toISOString() }], executions: [{ id: 'exec-2', status: 'RUNNING', workerId: 'work-1', startedAt: new Date(Date.now() - 4000).toISOString(), finishedAt: null, durationMs: null }] },
  { id: 'job-3', queueId: 'queue-1', projectId: 'proj-1', status: 'PENDING', priority: 0, payload: { type: 'processPayment', amount: 1200, userId: 'usr-283' }, runAt: new Date(Date.now() + 15000).toISOString(), maxRetries: 3, currentRetry: 0, createdById: 'user-1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), logs: [], executions: [] },
  { id: 'job-4', queueId: 'queue-2', projectId: 'proj-1', status: 'FAILED', priority: 0, payload: { type: 'simulateFailure' }, runAt: new Date(Date.now() - 60000).toISOString(), maxRetries: 2, currentRetry: 2, createdById: 'user-1', createdAt: new Date(Date.now() - 70000).toISOString(), updatedAt: new Date(Date.now() - 50000).toISOString(), logs: [{ message: 'Attempt #1 failed: Timeout connecting to microservice', level: 'ERROR', timestamp: new Date(Date.now() - 68000).toISOString() }, { message: 'Attempt #2 failed: Timeout connecting to microservice', level: 'ERROR', timestamp: new Date(Date.now() - 50000).toISOString() }, { message: 'Max retries exceeded (2/2). Moving to Dead Letter Queue (DLQ).', level: 'ERROR', timestamp: new Date(Date.now() - 50000).toISOString() }], executions: [{ id: 'exec-3', status: 'FAILED', workerId: 'work-2', startedAt: new Date(Date.now() - 51000).toISOString(), finishedAt: new Date(Date.now() - 50000).toISOString(), durationMs: 1000, errorMessage: 'Timeout connecting to microservice: checkout-service' }] }
];

export let MOCK_WORKERS = [
  { id: 'work-1', name: 'worker-acer-4011', status: 'BUSY', cpuUsage: 45.5, memoryUsage: 68.2, runningJobsCount: 1, lastSeen: new Date().toISOString() },
  { id: 'work-2', name: 'worker-acer-9923', status: 'IDLE', cpuUsage: 4.2, memoryUsage: 35.1, runningJobsCount: 0, lastSeen: new Date().toISOString() },
  { id: 'work-3', name: 'worker-zombie-dead', status: 'OFFLINE', cpuUsage: 0, memoryUsage: 0, runningJobsCount: 0, lastSeen: new Date(Date.now() - 120000).toISOString() }
];

let MOCK_DLQ = [
  { id: 'dlq-1', originalJobId: 'job-4', queueId: 'queue-2', projectId: 'proj-1', payload: { type: 'simulateFailure' }, failureReason: 'Timeout connecting to microservice: checkout-service', stackTrace: 'Error: Timeout connecting to microservice: checkout-service\n    at simulateFailure (jobExecutor.ts:24:11)\n    at executeJob (jobExecutor.ts:114:15)', attempts: 2, createdAt: new Date(Date.now() - 50000).toISOString() }
];

// Determine if we should use Mock Mode (default true if API server is offline)
let mockMode = true;

const apiBaseURL = import.meta.env.VITE_API_URL || '/api';

const checkBackend = async () => {
  try {
    const res = await axios.get(`${apiBaseURL}/health`);
    if (res.status === 200) {
      mockMode = false;
      console.log('API Server online. Mock mode disabled.');
    }
  } catch (err) {
    mockMode = true;
    console.log('API Server offline. Falling back to local frontend mock mode.');
  }
};
checkBackend();

// Setup API Instance
const api = axios.create({
  baseURL: apiBaseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Run Mock Worker Simulator inside the browser to make the dashboard feel alive!
setInterval(() => {
  if (!mockMode) return;

  // 1. Update CPU/Memory metrics randomly
  MOCK_WORKERS = MOCK_WORKERS.map(w => {
    if (w.status === 'OFFLINE') return w;
    const cpuChange = (Math.random() - 0.5) * 15;
    const memChange = (Math.random() - 0.5) * 5;
    return {
      ...w,
      cpuUsage: parseFloat(Math.min(100, Math.max(0, w.cpuUsage + cpuChange)).toFixed(1)),
      memoryUsage: parseFloat(Math.min(100, Math.max(10, w.memoryUsage + memChange)).toFixed(1)),
      lastSeen: new Date().toISOString()
    };
  });

  // 2. Poll & Process Pending Jobs
  const now = new Date();
  const pendingJobs = MOCK_JOBS.filter(j => j.status === 'PENDING' && new Date(j.runAt) <= now);

  if (pendingJobs.length > 0) {
    const jobToRun = pendingJobs[0];
    const queue = MOCK_QUEUES.find(q => q.id === jobToRun.queueId);
    
    // Check queue concurrency limit
    const runningInQueue = MOCK_JOBS.filter(j => j.queueId === jobToRun.queueId && (j.status === 'RUNNING' || j.status === 'CLAIMED')).length;

    if (queue && !queue.isPaused && runningInQueue < queue.concurrencyLimit) {
      const activeWorker = MOCK_WORKERS.find(w => w.status === 'IDLE');
      const worker = activeWorker || MOCK_WORKERS[0];
      
      // Update job state to RUNNING
      jobToRun.status = 'RUNNING';
      jobToRun.updatedAt = new Date().toISOString();
      jobToRun.logs = [
        { message: `Claimed by worker ${worker.name}`, level: 'INFO', timestamp: new Date().toISOString() }
      ];
      jobToRun.executions = [
        { id: `exec-${Date.now()}`, status: 'RUNNING', workerId: worker.id, startedAt: new Date().toISOString(), finishedAt: null, durationMs: null }
      ];

      worker.status = 'BUSY';
      worker.runningJobsCount += 1;

      // Simulate execution time (2 seconds)
      setTimeout(() => {
        const payload = jobToRun.payload as any;
        const duration = 2000;
        
        worker.runningJobsCount = Math.max(0, worker.runningJobsCount - 1);
        if (worker.runningJobsCount === 0) worker.status = 'IDLE';

        if (payload?.type === 'simulateFailure') {
          // Failure flow
          jobToRun.logs.push({ message: 'Execution failed: Simulated transaction error', level: 'ERROR', timestamp: new Date().toISOString() });
          
          if (jobToRun.currentRetry < jobToRun.maxRetries) {
            jobToRun.currentRetry += 1;
            jobToRun.status = 'RETRYING';
            jobToRun.runAt = new Date(Date.now() + 5000).toISOString(); // Retry in 5s
            jobToRun.logs.push({ message: `Scheduled retry attempt #${jobToRun.currentRetry} in 5000ms`, level: 'WARN', timestamp: new Date().toISOString() });
          } else {
            jobToRun.status = 'FAILED';
            // Move to DLQ
            const newDlqEntry = {
              id: `dlq-${Date.now()}`,
              originalJobId: jobToRun.id,
              queueId: jobToRun.queueId,
              projectId: jobToRun.projectId,
              payload: jobToRun.payload,
              failureReason: 'Simulated transaction error',
              stackTrace: 'Error: Simulated transaction error\n    at simulateFailure (localSimulator.js:10:1)',
              attempts: jobToRun.currentRetry,
              createdAt: new Date().toISOString()
            };
            MOCK_DLQ.push(newDlqEntry);
            jobToRun.logs.push({ message: 'Max retries exceeded. Archived in DLQ.', level: 'ERROR', timestamp: new Date().toISOString() });
          }
        } else {
          // Success flow
          jobToRun.status = 'COMPLETED';
          jobToRun.logs.push({ message: 'Transaction completed successfully.', level: 'INFO', timestamp: new Date().toISOString() });
          jobToRun.logs.push({ message: `Job executed successfully in ${duration}ms`, level: 'INFO', timestamp: new Date().toISOString() });
          
          const exec = jobToRun.executions[0];
          exec.status = 'COMPLETED';
          exec.finishedAt = new Date().toISOString();
          exec.durationMs = duration;
        }
        jobToRun.updatedAt = new Date().toISOString();
      }, 2000);
    }
  }
}, 3000);

export const authService = {
  login: async (credentials: any) => {
    if (mockMode) {
      const user = MOCK_USERS[0];
      localStorage.setItem('token', 'mock-token-abc-123');
      return { status: 'success', data: { user, tokens: { accessToken: 'mock-token', refreshToken: 'mock-refresh' } } };
    }
    const res = await api.post('/auth/login', credentials);
    localStorage.setItem('token', res.data.data.tokens.accessToken);
    return res.data;
  },
  register: async (data: any) => {
    if (mockMode) {
      const user = { id: `user-${Date.now()}`, email: data.email, firstName: data.firstName, lastName: data.lastName };
      MOCK_USERS.push(user);
      localStorage.setItem('token', 'mock-token-abc-123');
      return { status: 'success', data: { user, tokens: { accessToken: 'mock-token' } } };
    }
    const res = await api.post('/auth/register', data);
    localStorage.setItem('token', res.data.data.tokens.accessToken);
    return res.data;
  },
  me: async () => {
    if (mockMode) {
      return { status: 'success', data: { user: MOCK_USERS[0] } };
    }
    const res = await api.get('/auth/me');
    return res.data;
  },
  logout: async () => {
    localStorage.removeItem('token');
    if (!mockMode) {
      await api.post('/auth/logout');
    }
  }
};

export const orgService = {
  list: async () => {
    if (mockMode) return { status: 'success', data: { organizations: MOCK_ORGS } };
    const res = await api.get('/organizations');
    return res.data;
  },
  create: async (data: any) => {
    if (mockMode) {
      const newOrg = { id: `org-${Date.now()}`, name: data.name, slug: data.name.toLowerCase().replace(/\s+/g, '-'), role: 'OWNER' };
      MOCK_ORGS.push(newOrg);
      return { status: 'success', data: { organization: newOrg } };
    }
    const res = await api.post('/organizations', data);
    return res.data;
  }
};

export const projectService = {
  list: async (orgId: string) => {
    if (mockMode) {
      const projects = MOCK_PROJECTS.filter(p => p.organizationId === orgId);
      return { status: 'success', data: { projects, pagination: { total: projects.length, page: 1, limit: 10, totalPages: 1 } } };
    }
    const res = await api.get('/projects', { params: { orgId } });
    return res.data;
  },
  create: async (data: any) => {
    if (mockMode) {
      const newProj = { id: `proj-${Date.now()}`, organizationId: data.organizationId, name: data.name, description: data.description || '', createdAt: new Date().toISOString() };
      MOCK_PROJECTS.push(newProj);
      return { status: 'success', data: { project: newProj } };
    }
    const res = await api.post('/projects', data);
    return res.data;
  }
};

export const queueService = {
  list: async (projectId: string) => {
    if (mockMode) {
      const queues = MOCK_QUEUES.filter(q => q.projectId === projectId);
      return { status: 'success', data: { queues } };
    }
    const res = await api.get('/queues', { params: { projectId } });
    return res.data;
  },
  create: async (data: any) => {
    if (mockMode) {
      const newQueue = { id: `queue-${Date.now()}`, projectId: data.projectId, name: data.name, description: data.description || '', concurrencyLimit: data.concurrencyLimit || 1, isPaused: false, createdAt: new Date().toISOString() };
      MOCK_QUEUES.push(newQueue);
      return { status: 'success', data: { queue: newQueue } };
    }
    const res = await api.post('/queues', data);
    return res.data;
  },
  pause: async (queueId: string) => {
    if (mockMode) {
      const q = MOCK_QUEUES.find(queue => queue.id === queueId);
      if (q) q.isPaused = true;
      return { status: 'success' };
    }
    const res = await api.put(`/queues/${queueId}/pause`);
    return res.data;
  },
  resume: async (queueId: string) => {
    if (mockMode) {
      const q = MOCK_QUEUES.find(queue => queue.id === queueId);
      if (q) q.isPaused = false;
      return { status: 'success' };
    }
    const res = await api.put(`/queues/${queueId}/resume`);
    return res.data;
  },
  stats: async (queueId: string) => {
    if (mockMode) {
      const qJobs = MOCK_JOBS.filter(j => j.queueId === queueId);
      const stats = { PENDING: 0, CLAIMED: 0, RUNNING: 0, COMPLETED: 0, FAILED: 0, RETRYING: 0, CANCELLED: 0 };
      qJobs.forEach(j => { stats[j.status as keyof typeof stats]++ });
      return { status: 'success', data: { queueId, stats } };
    }
    const res = await api.get(`/queues/${queueId}/stats`);
    return res.data;
  },
  delete: async (queueId: string) => {
    if (mockMode) {
      const idx = MOCK_QUEUES.findIndex(q => q.id === queueId);
      if (idx !== -1) MOCK_QUEUES.splice(idx, 1);
      MOCK_JOBS = MOCK_JOBS.filter(j => j.queueId !== queueId);
      return { status: 'success' };
    }
    const res = await api.delete(`/queues/${queueId}`);
    return res.data;
  }
};

export const retryPolicyService = {
  list: async () => {
    return { status: 'success', data: { policies: MOCK_RETRY_POLICIES } };
  }
};

export const jobService = {
  list: async (params: { projectId: string; queueId?: string; status?: string; page?: number; limit?: number; sortBy?: string; sortOrder?: string }) => {
    if (mockMode) {
      let jobs = MOCK_JOBS.filter(j => j.projectId === params.projectId);
      if (params.queueId) jobs = jobs.filter(j => j.queueId === params.queueId);
      if (params.status) jobs = jobs.filter(j => j.status === params.status);

      return { status: 'success', data: { jobs, pagination: { total: jobs.length, page: params.page || 1, limit: params.limit || 10, totalPages: 1 } } };
    }
    const res = await api.get('/jobs', { params });
    return res.data;
  },
  create: async (data: any) => {
    if (mockMode) {
      const newJob = {
        id: `job-${Date.now()}`,
        queueId: data.queueId,
        projectId: data.projectId,
        status: 'PENDING',
        priority: data.priority || 0,
        payload: data.payload || {},
        runAt: data.delaySeconds ? new Date(Date.now() + data.delaySeconds * 1000).toISOString() : new Date().toISOString(),
        maxRetries: data.maxRetries || 3,
        currentRetry: 0,
        createdById: 'user-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        logs: [],
        executions: []
      };
      MOCK_JOBS.push(newJob);
      return { status: 'success', data: { job: newJob } };
    }
    const res = await api.post('/jobs', data);
    return res.data;
  },
  get: async (jobId: string) => {
    if (mockMode) {
      const job = MOCK_JOBS.find(j => j.id === jobId);
      return { status: 'success', data: { job } };
    }
    const res = await api.get(`/jobs/${jobId}`);
    return res.data;
  },
  cancel: async (jobId: string) => {
    if (mockMode) {
      const job = MOCK_JOBS.find(j => j.id === jobId);
      if (job) job.status = 'CANCELLED';
      return { status: 'success' };
    }
    const res = await api.put(`/jobs/${jobId}/cancel`);
    return res.data;
  }
};

export const dlqService = {
  list: async (projectId: string) => {
    if (mockMode) {
      const entries = MOCK_DLQ.filter(d => d.projectId === projectId);
      return { status: 'success', data: { entries, pagination: { total: entries.length, page: 1, limit: 10, totalPages: 1 } } };
    }
    const res = await api.get('/dlq', { params: { projectId } });
    return res.data;
  },
  retry: async (dlqId: string) => {
    if (mockMode) {
      const entry = MOCK_DLQ.find(d => d.id === dlqId);
      if (entry) {
        // Find original job and update status
        const job = MOCK_JOBS.find(j => j.id === entry.originalJobId);
        if (job) {
          job.status = 'PENDING';
          job.currentRetry = 0;
          job.runAt = new Date().toISOString();
          job.logs.push({ message: 'Rescheduled from DLQ', level: 'INFO', timestamp: new Date().toISOString() });
        }
        MOCK_DLQ = MOCK_DLQ.filter(d => d.id !== dlqId);
      }
      return { status: 'success' };
    }
    const res = await api.post(`/dlq/${dlqId}/retry`);
    return res.data;
  },
  delete: async (dlqId: string) => {
    if (mockMode) {
      const entry = MOCK_DLQ.find(d => d.id === dlqId);
      if (entry) {
        MOCK_JOBS = MOCK_JOBS.filter(j => j.id !== entry.originalJobId);
        MOCK_DLQ = MOCK_DLQ.filter(d => d.id !== dlqId);
      }
      return { status: 'success' };
    }
    const res = await api.delete(`/dlq/${dlqId}`);
    return res.data;
  }
};

export const workerService = {
  list: async () => {
    if (mockMode) {
      return { status: 'success', data: { workers: MOCK_WORKERS } };
    }
    const res = await api.get('/workers');
    return res.data;
  }
};

export const metricsService = {
  get: async (projectId: string) => {
    if (mockMode) {
      const pJobs = MOCK_JOBS.filter(j => j.projectId === projectId);
      const jobs = {
        total: pJobs.length,
        PENDING: pJobs.filter(j => j.status === 'PENDING').length,
        CLAIMED: pJobs.filter(j => j.status === 'CLAIMED').length,
        RUNNING: pJobs.filter(j => j.status === 'RUNNING').length,
        COMPLETED: pJobs.filter(j => j.status === 'COMPLETED').length,
        FAILED: pJobs.filter(j => j.status === 'FAILED').length,
        RETRYING: pJobs.filter(j => j.status === 'RETRYING').length,
        CANCELLED: pJobs.filter(j => j.status === 'CANCELLED').length,
        successRate: 0,
        failureRate: 0,
        averageExecutionTimeMs: 2500
      };

      const dlqCount = MOCK_DLQ.filter(d => d.projectId === projectId).length;
      const finished = jobs.COMPLETED + jobs.FAILED + dlqCount;
      jobs.successRate = finished > 0 ? parseFloat(((jobs.COMPLETED / finished) * 100).toFixed(1)) : 100;
      jobs.failureRate = finished > 0 ? parseFloat((((jobs.FAILED + dlqCount) / finished) * 100).toFixed(1)) : 0;

      const activeWorkers = MOCK_WORKERS.filter(w => w.status !== 'OFFLINE');
      const workers = {
        total: MOCK_WORKERS.length,
        ONLINE: MOCK_WORKERS.filter(w => w.status === 'ONLINE').length,
        OFFLINE: MOCK_WORKERS.filter(w => w.status === 'OFFLINE').length,
        BUSY: MOCK_WORKERS.filter(w => w.status === 'BUSY').length,
        IDLE: MOCK_WORKERS.filter(w => w.status === 'IDLE').length,
        avgCpu: activeWorkers.length > 0 ? parseFloat((activeWorkers.reduce((acc, w) => acc + w.cpuUsage, 0) / activeWorkers.length).toFixed(1)) : 0,
        avgMemory: activeWorkers.length > 0 ? parseFloat((activeWorkers.reduce((acc, w) => acc + w.memoryUsage, 0) / activeWorkers.length).toFixed(1)) : 0
      };

      return {
        status: 'success',
        data: {
          jobs,
          workers,
          deadLetterQueueCount: dlqCount
        }
      };
    }
    const res = await api.get('/metrics', { params: { projectId } });
    return res.data;
  }
};
export default { auth: authService, org: orgService, project: projectService, queue: queueService, job: jobService, dlq: dlqService, worker: workerService, metrics: metricsService, policies: retryPolicyService };
