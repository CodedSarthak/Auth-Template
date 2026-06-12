# Production-Ready Auth Template

A complete, production-ready backend authentication template built with Node.js and TypeScript. Clone this to skip the boilerplate and start shipping features immediately.

---

## Features

- **User Registration** — with email verification flow
- **Email Verification** — token-based, with resend support
- **Local Login** — email + password with bcrypt verification
- **Google OAuth Sign-in** — via Google ID token (server-side verification)
- **Password Hashing** — bcrypt with configurable salt rounds
- **Forgot Password** — secure email-based reset flow
- **Access Token** — short-lived JWT (default: 15 minutes)
- **Refresh Token** — long-lived JWT (default: 7 days), stored as bcrypt hash in DB, rotated on every use
- **Session Management** — view active sessions, logout a specific session, logout all devices
- **Auth Middleware** — `authenticateToken` guards any protected route
- **Logout** — invalidates the specific session from the database
- **Rate Limiting** — Redis-backed with in-memory fallback, applied globally
- **User Profile** — view and update profile
- **Avatar Upload via S3** — presigned URL flow (client uploads directly to S3)
- **Structured Error Handling** — typed `AppError` hierarchy with a global error middleware
- **Request Logging** — structured JSON logs via Pino

---

## Technologies Used

| Category | Technology |
|---|---|
| **Runtime** | Node.js |
| **Language** | TypeScript |
| **Framework** | Express 5 |
| **ORM** | Prisma 7 (PostgreSQL) |
| **Auth** | JSON Web Tokens (`jsonwebtoken`) |
| **Password Hashing** | bcrypt |
| **Validation** | Zod |
| **Email Service** | Resend |
| **OAuth** | Google Auth Library |
| **File Storage** | AWS S3 (presigned URLs) |
| **Rate Limiting** | `rate-limiter-flexible` |
| **Cache / Rate Store** | Redis (`ioredis`) |
| **Logging** | Pino + pino-pretty |
| **Security Headers** | Helmet |
| **Dev Runner** | tsx (no build step in dev) |

---

## Prerequisites

Before running this project, make sure you have the following accounts and services set up:

- **Node.js** v20+ and npm
- **PostgreSQL** database (local or hosted, e.g. Supabase, Neon, Railway)
- **Redis** instance (local or hosted, e.g. Upstash)
- **Resend** account → [resend.com](https://resend.com) (for sending emails)
- **Google Cloud Console** project with an OAuth 2.0 Client ID configured
- **AWS S3** bucket with appropriate IAM credentials (for avatar uploads)

---

## Setup & Configuration

### 1. Clone and Install

```bash
git clone <repo-url>
cd backend
npm install
```

### 2. Configure Environment Variables

Copy the example file and fill in all values:

```bash
cp .env.example .env
```

Open `.env` and set the following variables:

#### Database
| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/mydb` |

#### Redis
| Variable | Description | Example |
|---|---|---|
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |

#### JWT
| Variable | Description | Example |
|---|---|---|
| `JWT_ACCESS_SECRET` | Secret key for signing access tokens | `a-long-random-secret` |
| `JWT_ACCESS_EXPIRATION` | Access token lifetime | `15m` |
| `JWT_REFRESH_SECRET` | Secret key for signing refresh tokens | `another-long-secret` |
| `JWT_REFRESH_EXPIRATION` | Refresh token lifetime | `7d` |

> **Duration format:** `15m` = 15 minutes, `7d` = 7 days, `2h` = 2 hours, `30s` = 30 seconds.

#### Token Expiry (Email / Password Reset)
| Variable | Description | Example |
|---|---|---|
| `TOKEN_EXPIRATION_TIME` | Expiry for email verification & password reset tokens, **in minutes** | `1440` (= 24 hours) |

#### Email (Resend)
| Variable | Description | Example |
|---|---|---|
| `RESEND_API_KEY` | API key from your Resend dashboard | `re_xxxxxxxxxxxx` |
| `FROM_EMAIL` | Sender address shown to users | `App Name <noreply@yourdomain.com>` |

#### Google OAuth
| Variable | Description | Where to get it |
|---|---|---|
| `GOOGLE_CLIENT_ID` | OAuth 2.0 Client ID | Google Cloud Console → APIs & Services → Credentials |

#### AWS S3 (Avatar Upload)
| Variable | Description | Example |
|---|---|---|
| `AWS_ACCESS_KEY_ID` | IAM user access key | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | IAM user secret | `wJalrXUtn...` |
| `AWS_REGION` | S3 bucket region | `us-east-1` |
| `S3_BUCKET` | S3 bucket name | `my-app-avatars` |

#### App
| Variable | Description | Example |
|---|---|---|
| `NODE_ENV` | Environment mode | `development` or `production` |
| `PORT` | HTTP server port | `3000` |
| `FRONTEND_URL` | Frontend origin for CORS and email links | `http://localhost:5173` |

#### Rate Limiting (Optional overrides)
| Variable | Description | Default |
|---|---|---|
| `RATE_LIMIT_POINTS` | Max requests per window | `100` |
| `RATE_LIMIT_DURATION` | Window size in seconds | `60` |
| `RATE_LIMIT_BLOCK` | Block duration in seconds after limit hit | `60` |

### 3. Run Prisma Migrations

```bash
# Apply migrations and generate Prisma Client
npm run migrate:dev -- --name init
npm run generate
```

### 4. Start the Development Server

```bash
npm run dev
```

The server starts at `http://localhost:3000`. No build step is needed in development — `tsx` runs TypeScript directly.

### 5. Production Build

```bash
npm run build   # Compiles to ./dist
npm start       # Runs compiled output
```

---

## Project Structure

```
src/
├── config/           # Service clients (Prisma, Redis, S3, email, logger)
├── constants/        # S3 file type / size constants
├── errors/           # AppError class hierarchy
├── middleware/        # auth, error handler, rate limiter, request logger
├── modules/
│   └── user/         # Routes, controller, service, repository, validation, DTOs
├── types/            # Express request type augmentation
└── utils/            # JWT, bcrypt, token, S3, MIME validation, duration parser
prisma/
└── schema.prisma     # Database schema
```

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server with hot reload (tsx) |
| `npm run build` | Compile TypeScript to `./dist` |
| `npm start` | Run compiled production build |
| `npm run migrate:dev` | Create and apply a new Prisma migration |
| `npm run generate` | Regenerate Prisma Client after schema changes |
| `npm run studio` | Open Prisma Studio (visual DB browser) |

---

## API Documentation

See [`API_Documentation.md`](./API_Documentation.md) for the full reference with request/response examples for every route.