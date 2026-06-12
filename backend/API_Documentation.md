# API Documentation

Base URL: `http://localhost:3000/api/auth`

All request bodies are JSON (`Content-Type: application/json`).  
Tokens are stored in **HttpOnly cookies** (`accessToken`, `refreshToken`) automatically by the server.  
Protected routes also require an `Authorization: Bearer <accessToken>` header.

---

## Table of Contents

1. [Register](#1-register)
2. [Verify Email](#2-verify-email)
3. [Resend Verification Email](#3-resend-verification-email)
4. [Login](#4-login)
5. [Google Login](#5-google-login)
6. [Refresh Token](#6-refresh-token)
7. [Logout](#7-logout)
8. [Forgot Password](#8-forgot-password)
9. [Reset Password](#9-reset-password)
10. [Get Current User](#10-get-current-user)
11. [Update Profile](#11-update-profile)
12. [Generate Avatar Upload URL](#12-generate-avatar-upload-url)
13. [Confirm Avatar Upload](#13-confirm-avatar-upload)
14. [Get Active Sessions](#14-get-active-sessions)
15. [Logout Specific Session](#15-logout-specific-session)
16. [Logout All Devices](#16-logout-all-devices)

---

## Authentication

### Cookie-based (primary)
The server sets `accessToken` and `refreshToken` as `HttpOnly` cookies on login/google-login/refresh.  
These are sent automatically by the browser on subsequent requests.

### Bearer token (alternative for API clients / mobile)
```
Authorization: Bearer <accessToken>
```

---

## Error Response Format

All errors follow this shape:

```json
{
  "success": false,
  "message": "Human-readable error description"
}
```

Validation errors (HTTP 400) include extra detail:

```json
{
  "success": false,
  "message": "Validation Error",
  "errors": [
    { "path": "email", "message": "Invalid email" },
    { "path": "password", "message": "Must contain one uppercase letter" }
  ]
}
```

### HTTP Status Codes

| Code | Meaning |
|---|---|
| `200` | Success |
| `201` | Created |
| `400` | Bad Request / Validation Error |
| `401` | Unauthorized (missing or invalid token) |
| `403` | Forbidden (valid token but no permission) |
| `404` | Not Found |
| `409` | Conflict (duplicate resource) |
| `429` | Too Many Requests |
| `500` | Internal Server Error |

---

## Public Routes

---

### 1. Register

Creates a new user account and sends an email verification link.

```
POST /api/auth/register
```

**Request Body**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "Secure@123"
}
```

| Field | Type | Rules |
|---|---|---|
| `name` | string | 2–100 characters |
| `email` | string | Valid email format |
| `password` | string | 8–128 chars, must include uppercase, lowercase, number, and special character |

**Success Response — `201 Created`**

```json
{
  "success": true,
  "message": "Registration successful. Please check your email to verify your account.",
  "user": {
    "id": "clx1abc123",
    "name": "John Doe",
    "email": "john@example.com",
    "accounts": "LOCAL"
  }
}
```

**Error Responses**

| Status | Message |
|---|---|
| `409` | `"User already exists with this email"` |
| `400` | Validation errors on name / email / password |

---

### 2. Verify Email

Verifies the user's email address using the token received in the verification email.

```
POST /api/auth/verify-email
```

**Request Body**

```json
{
  "token": "a1b2c3d4e5f6..."
}
```

| Field | Type | Rules |
|---|---|---|
| `token` | string | Required, non-empty |

**Success Response — `200 OK`**

```json
{
  "success": true,
  "message": "Email successfully verified. You can now log in."
}
```

**Error Responses**

| Status | Message |
|---|---|
| `400` | `"Invalid or expired verification token."` |
| `400` | `"Verification token has expired. Please request a new one."` |

---

### 3. Resend Verification Email

Sends a new verification email. Replaces any existing pending token.

```
POST /api/auth/resend-verification
```

**Request Body**

```json
{
  "email": "john@example.com"
}
```

**Success Response — `200 OK`**

```json
{
  "success": true,
  "message": "A new verification email has been sent."
}
```

> Note: If the email is not registered, the response is still a success message to prevent user enumeration.

**Error Responses**

| Status | Message |
|---|---|
| `409` | `"Email is already verified."` |

---

### 4. Login

Authenticates with email and password. Sets `accessToken` and `refreshToken` cookies.

```
POST /api/auth/login
```

**Request Body**

```json
{
  "email": "john@example.com",
  "password": "Secure@123"
}
```

| Field | Type | Rules |
|---|---|---|
| `email` | string | Valid email format |
| `password` | string | Required, non-empty |

**Success Response — `200 OK`**

Sets cookies: `accessToken` (15m), `refreshToken` (7d)

```json
{
  "success": true,
  "message": "Login successful.",
  "user": {
    "id": "clx1abc123",
    "name": "John Doe",
    "email": "john@example.com",
    "profileImage": null
  }
}
```

**Error Responses**

| Status | Message |
|---|---|
| `401` | `"Invalid email or password."` |
| `400` | `"User registered with an OAuth provider. Please login using that provider."` |
| `403` | `"Please verify your email before logging in."` |

---

### 5. Google Login

Sign in or register using a Google ID token (obtained from the frontend Google Sign-In flow).

```
POST /api/auth/login/google
```

**Request Body**

```json
{
  "idToken": "eyJhbGci..."
}
```

| Field | Type | Rules |
|---|---|---|
| `idToken` | string | Google ID token from frontend OAuth flow |

**Success Response — `200 OK`**

Sets cookies: `accessToken` (15m), `refreshToken` (7d)

```json
{
  "success": true,
  "message": "Google login successful.",
  "user": {
    "id": "clx1abc123",
    "name": "Jane Doe",
    "email": "jane@gmail.com",
    "profileImage": "https://lh3.googleusercontent.com/..."
  }
}
```

**Error Responses**

| Status | Message |
|---|---|
| `401` | `"Invalid Google token."` |

---

### 6. Refresh Token

Issues a new access token and refresh token. The old refresh token is invalidated (token rotation).

```
POST /api/auth/refresh
```

**Request**

No body required. The `refreshToken` cookie is read automatically.

**Success Response — `200 OK`**

Sets new cookies: `accessToken` (15m), `refreshToken` (7d)

```json
{
  "success": true,
  "accessToken": "eyJhbGci..."
}
```

**Error Responses**

| Status | Message |
|---|---|
| `401` | `"No refresh token provided."` |
| `401` | `"Invalid or expired refresh token."` |

---

### 7. Logout

Invalidates the current session. Clears auth cookies.

```
POST /api/auth/logout
```

**Request**

No body required. The `refreshToken` cookie is read automatically.

**Success Response — `200 OK`**

Clears cookies: `accessToken`, `refreshToken`

```json
{
  "success": true,
  "message": "Logout successful."
}
```

---

### 8. Forgot Password

Sends a password reset link to the user's email.

```
POST /api/auth/forgot-password
```

**Request Body**

```json
{
  "email": "john@example.com"
}
```

**Success Response — `200 OK`**

```json
{
  "success": true,
  "message": "If the email is registered, a password reset link has been sent."
}
```

> Note: Response is identical whether the email is registered or not — prevents user enumeration.

**Error Responses**

| Status | Message |
|---|---|
| `400` | `"User registered with an OAuth provider. Password reset is not applicable."` |

---

### 9. Reset Password

Resets the user's password using the token from the reset email.

```
POST /api/auth/reset-password
```

**Request Body**

```json
{
  "token": "a1b2c3d4e5f6...",
  "password": "NewSecure@456"
}
```

| Field | Type | Rules |
|---|---|---|
| `token` | string | Required, from reset email |
| `password` | string | 8–128 chars, uppercase, lowercase, number, special character |

**Success Response — `200 OK`**

```json
{
  "success": true,
  "message": "Password has been successfully reset."
}
```

**Error Responses**

| Status | Message |
|---|---|
| `400` | `"Invalid or expired password reset token."` |
| `400` | `"Password reset token has expired. Please request a new one."` |

---

## Protected Routes

> All routes below require a valid access token.  
> **Header:** `Authorization: Bearer <accessToken>`  
> (Or the `accessToken` HttpOnly cookie is sent automatically by the browser.)

---

### 10. Get Current User

Returns the authenticated user's profile.

```
GET /api/auth/me
```

**Request**

No body required.

**Success Response — `200 OK`**

```json
{
  "success": true,
  "user": {
    "id": "clx1abc123",
    "name": "John Doe",
    "email": "john@example.com",
    "profileImage": "users/clx1abc123/a1b2c3.jpg",
    "emailVerified": true
  }
}
```

**Error Responses**

| Status | Message |
|---|---|
| `401` | `"Access token missing"` |
| `403` | `"Invalid or expired access token"` |
| `404` | `"User not found."` |

---

### 11. Update Profile

Updates the authenticated user's display name.

```
PATCH /api/auth/profile
```

**Request Body**

```json
{
  "name": "John Updated"
}
```

| Field | Type | Rules |
|---|---|---|
| `name` | string | Optional, 2–100 characters |

**Success Response — `200 OK`**

```json
{
  "success": true,
  "message": "Profile updated successfully.",
  "user": {
    "id": "clx1abc123",
    "name": "John Updated",
    "email": "john@example.com",
    "profileImage": null
  }
}
```

---

### 12. Generate Avatar Upload URL

Generates a presigned S3 URL. The client uses this URL to upload the avatar file directly to S3.

```
POST /api/auth/avatar/upload-url
```

**Request Body**

```json
{
  "fileName": "avatar.jpg",
  "contentType": "image/jpeg"
}
```

| Field | Type | Allowed Values |
|---|---|---|
| `fileName` | string | Any non-empty filename |
| `contentType` | string | `"image/jpeg"` \| `"image/png"` \| `"image/webp"` |

**Success Response — `200 OK`**

```json
{
  "uploadUrl": "https://s3.amazonaws.com/bucket/users/clx1abc123/uuid.jpg?X-Amz-Signature=...",
  "fileKey": "users/clx1abc123/550e8400-e29b-41d4-a716-446655440000.jpg",
  "expiresIn": 300
}
```

| Field | Description |
|---|---|
| `uploadUrl` | Presigned PUT URL — valid for `expiresIn` seconds |
| `fileKey` | S3 object key — save this and send it to `/avatar` after upload |
| `expiresIn` | Seconds until the presigned URL expires (default: 300s) |

**Client-side upload step:**
```
PUT <uploadUrl>
Content-Type: image/jpeg
Body: <file binary data>
```

**Error Responses**

| Status | Message |
|---|---|
| `400` | `"Unsupported file type: image/gif. Allowed types: image/jpeg, image/png, image/webp"` |

---

### 13. Confirm Avatar Upload

Confirms the upload was completed and updates the user's profile image.

```
PATCH /api/auth/avatar
```

**Request Body**

```json
{
  "fileKey": "users/clx1abc123/550e8400-e29b-41d4-a716-446655440000.jpg"
}
```

| Field | Type | Rules |
|---|---|---|
| `fileKey` | string | The `fileKey` returned from `/avatar/upload-url` |

**Success Response — `200 OK`**

```json
{
  "success": true
}
```

**Error Responses**

| Status | Message |
|---|---|
| `403` | `"Invalid avatar key."` (fileKey does not belong to this user) |
| `404` | `"User not found."` |
| `400` | `"Avatar upload not found."` (file not found in S3) |

---

### 14. Get Active Sessions

Returns all active (non-expired) sessions for the authenticated user.

```
GET /api/auth/sessions
```

**Success Response — `200 OK`**

```json
{
  "success": true,
  "sessions": [
    {
      "id": "clx2session1",
      "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
      "ipAddress": "192.168.1.1",
      "lastUsedAt": "2025-06-12T10:30:00.000Z",
      "createdAt": "2025-06-10T08:00:00.000Z"
    },
    {
      "id": "clx2session2",
      "userAgent": "PostmanRuntime/7.36.0",
      "ipAddress": "10.0.0.1",
      "lastUsedAt": "2025-06-12T09:00:00.000Z",
      "createdAt": "2025-06-11T12:00:00.000Z"
    }
  ]
}
```

---

### 15. Logout Specific Session

Terminates a specific session by its ID (useful for "logout from this device" functionality).

```
DELETE /api/auth/sessions/:sessionId
```

**URL Parameter**

| Parameter | Description |
|---|---|
| `sessionId` | The `id` from the sessions list |

**Example**

```
DELETE /api/auth/sessions/clx2session2
```

**Success Response — `200 OK`**

```json
{
  "success": true,
  "message": "Session successfully logged out."
}
```

**Error Responses**

| Status | Message |
|---|---|
| `404` | `"Session not found."` |
| `403` | `"You do not have permission to delete this session."` |

---

### 16. Logout All Devices

Terminates all sessions for the authenticated user. Clears auth cookies on the current device.

```
DELETE /api/auth/sessions
```

**Success Response — `200 OK`**

Clears cookies: `accessToken`, `refreshToken`

```json
{
  "success": true,
  "message": "Logout all devices successful."
}
```

---

## Route Summary

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Create account |
| `POST` | `/api/auth/verify-email` | Public | Verify email with token |
| `POST` | `/api/auth/resend-verification` | Public | Resend verification email |
| `POST` | `/api/auth/login` | Public | Login with email + password |
| `POST` | `/api/auth/login/google` | Public | Login with Google ID token |
| `POST` | `/api/auth/refresh` | Public | Rotate refresh token |
| `POST` | `/api/auth/logout` | Public | Logout current session |
| `POST` | `/api/auth/forgot-password` | Public | Send password reset email |
| `POST` | `/api/auth/reset-password` | Public | Reset password with token |
| `GET` | `/api/auth/me` | 🔒 Protected | Get current user profile |
| `PATCH` | `/api/auth/profile` | 🔒 Protected | Update display name |
| `POST` | `/api/auth/avatar/upload-url` | 🔒 Protected | Get S3 presigned upload URL |
| `PATCH` | `/api/auth/avatar` | 🔒 Protected | Confirm avatar upload |
| `GET` | `/api/auth/sessions` | 🔒 Protected | List active sessions |
| `DELETE` | `/api/auth/sessions/:sessionId` | 🔒 Protected | Logout specific session |
| `DELETE` | `/api/auth/sessions` | 🔒 Protected | Logout all devices |

---

## Avatar Upload Flow (Full Example)

The avatar upload is a two-step presigned URL pattern — the file goes directly from the client to S3 without passing through the server.

```
Step 1: Client → Server
POST /api/auth/avatar/upload-url
{ "fileName": "photo.jpg", "contentType": "image/jpeg" }

← Response: { "uploadUrl": "...", "fileKey": "users/abc/uuid.jpg", "expiresIn": 300 }

Step 2: Client → S3 (direct, no server involved)
PUT <uploadUrl>
Content-Type: image/jpeg
Body: <binary file data>

Step 3: Client → Server
PATCH /api/auth/avatar
{ "fileKey": "users/abc/uuid.jpg" }

← Response: { "success": true }
```

---

## Rate Limiting

All routes are subject to global rate limiting.

| Default | Value |
|---|---|
| Max requests | 100 per window |
| Window size | 60 seconds |
| Block duration | 60 seconds |

Response headers on every request:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1718187660
```

When the limit is exceeded:

```
HTTP 429 Too Many Requests
Retry-After: 45

{
  "success": false,
  "message": "Too many requests. Please try again later."
}
```
