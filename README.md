# Distributed Job Scheduler

A high-performance, containerized, distributed job scheduler utilizing atomic database locking for secure concurrent execution. Built as a TypeScript monorepo combining an Express REST API backend, independent polling worker processes, and a glassmorphic React dashboard frontend.

---

## 🏗️ Architecture Design

```mermaid
graph TD
    subgraph Frontend Layer
        React[React Dashboard UI]
    end

    subgraph API Broker Layer
        Express[Express REST API]
        Scheduler[Scheduler Daemon]
    end

    subgraph Database Layer
        Postgres[(PostgreSQL DB)]
    end

    subgraph Distributed Compute Cluster
        Worker1[Worker 1]
        Worker2[Worker 2]
        WorkerN[Worker N]
    end

    React <-->|HTTPS / WS| Express
    Express <-->|Prisma Client| Postgres
    Scheduler <-->|Poll / Write| Postgres
    Worker1 <-->|Raw Tx: SKIP LOCKED| Postgres
    Worker2 <-->|Raw Tx: SKIP LOCKED| Postgres
    WorkerN <-->|Raw Tx: SKIP LOCKED| Postgres
    Worker1 <-->|HTTP telemetry webhook| Express
    Worker2 <-->|HTTP telemetry webhook| Express
    WorkerN <-->|HTTP telemetry webhook| Express
```

---

## 🗄️ Database Entity Relationship (ER) Model

```mermaid
erDiagram
    users {
        string id PK
        string email UK
        string password_hash
        string first_name
        string last_name
        timestamp created_at
    }
    organizations {
        string id PK
        string name
        string slug UK
        timestamp created_at
    }
    organization_members {
        string id PK
        string organization_id FK
        string user_id FK
        string role
        timestamp created_at
    }
    projects {
        string id PK
        string name
        string description
        string organization_id FK
        timestamp created_at
    }
    queues {
        string id PK
        string name
        string description
        string project_id FK
        boolean is_paused
        int concurrency_limit
        timestamp created_at
    }
    retry_policies {
        string id PK
        string name
        string type
        int max_retries
        int base_delay_ms
    }
    jobs {
        string id PK
        string queue_id FK
        string project_id FK
        string status
        int priority
        json payload
        timestamp run_at
        string retry_policy_id FK
        int max_retries
        int current_retry
        string cron_expression
        timestamp next_run_at
        string created_by_id FK
        timestamp created_at
    }
    job_executions {
        string id PK
        string job_id FK
        string worker_id FK
        string status
        timestamp started_at
        timestamp finished_at
        int duration_ms
        string error_message
        string stack_trace
    }
    job_logs {
        string id PK
        string job_execution_id FK
        string job_id FK
        string message
        string level
        timestamp timestamp
    }
    workers {
        string id PK
        string name
        string status
        timestamp last_seen
        float cpu_usage
        float memory_usage
        int running_jobs_count
    }
    dead_letter_queues {
        string id PK
        string original_job_id
        string queue_id FK
        string project_id FK
        json payload
        string failure_reason
        string stack_trace
        int attempts
        timestamp created_at
    }

    users ||--o{ organization_members : "belongs to"
    organizations ||--o{ organization_members : "hosts"
    organizations ||--o{ projects : "owns"
    projects ||--o{ queues : "contains"
    projects ||--o{ jobs : "schedules"
    queues ||--o{ jobs : "enqueues"
    retry_policies ||--o{ jobs : "applies to"
    jobs ||--o{ job_executions : "runs"
    jobs ||--o{ job_logs : "records"
    job_executions ||--o{ job_logs : "emits"
    workers ||--o{ job_executions : "executes"
    queues ||--o{ dead_letter_queues : "quarantines"
    projects ||--o{ dead_letter_queues : "holds"
```

---

## ⚡ Job Claiming & Execution Sequence

```mermaid
sequenceDiagram
    autonumber
    actor W as Worker Node
    participant DB as PostgreSQL
    participant BH as Express API
    actor S as Scheduler Daemon

    S->>DB: Scan recurring cron templates
    DB-->>S: Return templates due (nextRunAt <= NOW)
    S->>DB: Spawn concrete PENDING jobs + increment nextRunAt (Tx)

    Note over W,DB: Atomic Polling Loop (SELECT FOR UPDATE SKIP LOCKED)
    W->>DB: Begin Transaction & Query available job
    DB-->>W: Return unlocked job & lock row (SKIP LOCKED)
    W->>DB: Update job status = CLAIMED (Commit)
    W->>BH: POST /internal/jobs/events (job.started)
    BH-->>W: Broadcast starting state over WebSockets

    W->>W: Execute registered task handler payload
    alt Handlers succeeds
        W->>DB: Update job & execution status = COMPLETED (Tx)
        W->>BH: POST /internal/jobs/events (job.completed)
    else Handler throws error (Retry policy applies)
        W->>DB: Update status = RETRYING, increment currentRetry, set runAt = NOW + delay (Tx)
        W->>BH: POST /internal/jobs/events (job.retrying)
    else Max retries exceeded (DLQ archive)
        W->>DB: Update status = FAILED, create DeadLetterQueue entry (Tx)
        W->>BH: POST /internal/jobs/events (job.failed)
    end
```

---

## 📡 API Reference Documentation

All endpoints (except auth routes) expect a `Bearer <token>` inside the `Authorization` header.

### 1. Authentication
- `POST /auth/register` - Creates a new user account.
- `POST /auth/login` - Validates credentials; returns access/refresh JWT tokens.
- `POST /auth/refresh` - Emits a new access token using a refresh token.
- `GET /auth/me` - Profile overview of the active session.

### 2. Organizations & Projects
- `POST /organizations` - Create a new org (creator automatically gains OWNER role).
- `GET /organizations` - Lists org memberships for the user.
- `POST /organizations/:orgId/members` - Invite/assign member roles (`OWNER`, `ADMIN`, `DEVELOPER`, `VIEWER`).
- `POST /projects` - Create a project in an org (requires OWNER/ADMIN).
- `GET /projects` - Lists projects with filtering, sorting, and search.

### 3. Queues & Jobs
- `POST /queues` - Initialize a queue (supports custom concurrency limits).
- `PUT /queues/:queueId/pause` - Pauses polling execution in a queue.
- `PUT /queues/:queueId/resume` - Resumes polling execution in a queue.
- `GET /queues/:queueId/stats` - Returns counts by job status (PENDING, RUNNING, etc.).
- `POST /jobs` - Enqueue an immediate, delayed (`delaySeconds`), or recurring (`cronExpression`) job.
- `POST /jobs/batch` - Enqueue a batch of jobs inside a transaction.
- `GET /jobs/:jobId` - Detailed diagnostics showing raw payload, executions, and execution log streams.

### 4. Metrics & Operations
- `GET /metrics?projectId=<id>` - Aggregated dashboards counters and throughput trends.
- `GET /workers` - Active worker nodes cluster status and telemetry load.
- `GET /dlq?projectId=<id>` - Audit dead letter queue logs.
- `POST /dlq/:dlqId/retry` - Re-enqueue a failed job and delete its quarantine record.

---

## ⚙️ Running Locally

### Prerequisites
- Node.js (v18+)
- Docker & Docker Compose (optional, for local DB)

### 1. Database Setup
Spin up PostgreSQL via Docker:
```bash
npm run db:up
```
If you do not have Docker installed, configure a local PostgreSQL instance and set `DATABASE_URL` in `backend/.env`. Then run migrations and generate client:
```bash
npm run db:migrate
npm run db:generate
```

### 2. Install & Start Server
Install all dependencies for workspaces from the monorepo root:
```bash
npm install
```

Start the Express API server (port 3001) and background scheduler:
```bash
npm run backend:dev
```

### 3. Start Workers
Start one or more compute worker processes:
```bash
npm run worker:dev
```

### 4. Start Dashboard UI
Start the React Vite dashboard (port 3000):
```bash
npm run frontend:dev
```

---

## 📈 Design Trade-offs & Performance Considerations

1. **Database-Backed Queue (SKIP LOCKED)**: Using Postgres as a message broker avoids the complexity of running Redis (BullMQ) or RabbitMQ. Using `FOR UPDATE SKIP LOCKED` prevents race conditions where multiple workers try to claim the same task. However, this is bounded by Postgres CPU/disk write throughput. For scale beyond 10,000 jobs/sec, a dedicated broker (Kafka/RabbitMQ) should be adopted.
2. **Stateless JWTs vs Session Stores**: Using stateless JWTs speeds up auth validation without querying the DB on every HTTP call. Token revocation is handled by client-side purge. For strict immediate logout, a Redis blacklist cache would represent a future enhancement.
3. **Local Concurrency Promise Pool**: Workers limit local concurrency using a Promise Pool to prevent host CPU exhaustion, while queue concurrency is managed globally in Postgres queries. This guarantees distributed rate limits are respected even with many active workers.
