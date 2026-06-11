# Backend Authentication Implementation

This repository contains end-to-end backend implementation of Authentication which is required for majority of backend projects. 

---

## Features
- User Register with Email Verification
- User Login 
- Auth Provider Sign in  
- Password Hashing
- Logout 
- Access Token
- Refresh Token
- Middleware 
- Forgot Password via Email 
- Rate Limiting with redis 
- User Profile 
- Uploading avatar via S3 
- Session Management : View Active Sessions, Logout Specific Session, Logout All Devices


---

## Initial Setup & Configuration (TypeScript + Prisma)

Before diving into the authentication logic, here is the step-by-step process used to initialize the backend from scratch.

### 1. Project Initialization
```bash
mkdir backend && cd backend
npm init -y
```

### 2. Install Dependencies
```bash
# Core dependencies
npm i express cors dotenv cookie-parser jsonwebtoken bcrypt zod @prisma/client google-auth-library helmet

# Development dependencies
npm i -D typescript @types/node @types/express @types/cors @types/cookie-parser @types/jsonwebtoken @types/bcrypt prisma

# Rate Limiting dependencies
npm install ioredis rate-limiter-flexible
npm install -D @types/ioredis
```

### 3. TypeScript Configuration
Initialize TypeScript:
```bash
npx tsc --init
```
Update `tsconfig.json` to configure the output directory and module resolution (e.g., setting `"outDir": "./dist"`, `"rootDir": "./src"`, and `"module": "NodeNext"`).

Update `package.json` to support ES modules and define standard scripts:
```json
{
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsc -w",
    "migrate:dev": "prisma migrate dev",
    "generate": "prisma generate"
  }
}
```

### 4. Prisma ORM Setup
Initialize Prisma:
```bash
npx prisma init
```
This creates `prisma/schema.prisma`, `prisma.config.ts` (in Prisma 7+), and a `.env` file. We configured `prisma.config.ts` to connect to our PostgreSQL database via the `.env` file. 

After defining the schema, we validated, applied the database migration, and generated the Prisma client:
```bash
npx prisma validate
npm run migrate:dev -- --name init
npm run generate
```