# E2E Curl Commands — Auth Template

Replace `http://localhost:3000` with your actual server URL.
For protected routes, replace `<ACCESS_TOKEN>` with a real token obtained from login.

---

## 1. Health Check

```bash
curl -s http://localhost:3000/health
```

**Expected:** `{"status":"ok"}`

---

## 2. Register

```bash
curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "Secure@123"
  }'
```

**Expected 201:**
```json
{ "success": true, "message": "Registration successful. Please check your email to verify your account.", "user": { "id": "...", "name": "John Doe", "email": "john@example.com" } }
```

**Duplicate email → 409:**
```bash
curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","password":"Secure@123"}'
```

**Weak password → 400:**
```bash
curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","password":"weak"}'
```

---

## 3. Verify Email

```bash
curl -s -X POST http://localhost:3000/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"token": "<TOKEN_FROM_EMAIL>"}'
```

**Expected 200:** `{"success":true,"message":"Email successfully verified. You can now log in."}`

**Invalid token → 400:**
```bash
curl -s -X POST http://localhost:3000/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"token": "made-up-token"}'
```

---

## 4. Resend Verification Email

```bash
curl -s -X POST http://localhost:3000/api/auth/resend-verification \
  -H "Content-Type: application/json" \
  -d '{"email": "john@example.com"}'
```

**Expected 200:** `{"success":true,"message":"A new verification email has been sent."}`

---

## 5. Login (save cookies to file for subsequent requests)

```bash
curl -s -c cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "Secure@123"
  }'
```

**Expected 200:** Returns `user` object; sets `accessToken` and `refreshToken` HttpOnly cookies.

**Wrong password → 401:**
```bash
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"Wrong@Pass1"}'
```

**Unverified email → 403:**
```bash
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"unverified@example.com","password":"Secure@123"}'
```

---

## 6. Google Login

```bash
curl -s -c cookies.txt -X POST http://localhost:3000/api/auth/login/google \
  -H "Content-Type: application/json" \
  -d '{"idToken": "<GOOGLE_ID_TOKEN_FROM_FRONTEND>"}'
```

---

## 7. Get Current User (protected — uses cookie file)

```bash
# Using cookies from login
curl -s -b cookies.txt http://localhost:3000/api/auth/me

# Or using Bearer token
curl -s http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

**Expected 200:**
```json
{ "success": true, "user": { "id": "...", "name": "John Doe", "email": "john@example.com", "profileImage": null, "emailVerified": true } }
```

**No token → 401:**
```bash
curl -s http://localhost:3000/api/auth/me
```

---

## 8. Refresh Token

```bash
# Requires the refreshToken cookie to be present
curl -s -c cookies.txt -b cookies.txt -X POST http://localhost:3000/api/auth/refresh
```

**Expected 200:** Returns new `accessToken`; rotates both cookies.

**No cookie → 401:**
```bash
curl -s -X POST http://localhost:3000/api/auth/refresh
```

---

## 9. Update Profile (protected)

```bash
curl -s -b cookies.txt -X PATCH http://localhost:3000/api/auth/profile \
  -H "Content-Type: application/json" \
  -d '{"name": "John Updated"}'
```

**Expected 200:** `{"success":true,"message":"Profile updated successfully.","user":{...}}`

---

## 10. Generate Avatar Upload URL (protected)

```bash
curl -s -b cookies.txt -X POST http://localhost:3000/api/auth/avatar/upload-url \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "avatar.jpg",
    "contentType": "image/jpeg"
  }'
```

**Expected 200:**
```json
{ "uploadUrl": "https://s3.amazonaws.com/...", "fileKey": "users/<userId>/uuid.jpg", "expiresIn": 300 }
```

**Save the `fileKey` — you'll need it for step 11.**

**Invalid content type → 400:**
```bash
curl -s -b cookies.txt -X POST http://localhost:3000/api/auth/avatar/upload-url \
  -H "Content-Type: application/json" \
  -d '{"fileName":"avatar.gif","contentType":"image/gif"}'
```

---

## 11. Upload File to S3 (direct — no server involved)

```bash
# Use the uploadUrl from step 10
curl -s -X PUT "<UPLOAD_URL_FROM_STEP_10>" \
  -H "Content-Type: image/jpeg" \
  --data-binary "@/path/to/your/avatar.jpg"
```

---

## 12. Confirm Avatar Upload (protected)

```bash
curl -s -b cookies.txt -X PATCH http://localhost:3000/api/auth/avatar \
  -H "Content-Type: application/json" \
  -d '{"fileKey": "<FILE_KEY_FROM_STEP_10>"}'
```

**Expected 200:** `{"success":true}`

**Wrong fileKey prefix → 403:**
```bash
curl -s -b cookies.txt -X PATCH http://localhost:3000/api/auth/avatar \
  -H "Content-Type: application/json" \
  -d '{"fileKey":"users/someone-else/photo.jpg"}'
```

---

## 13. Get Active Sessions (protected)

```bash
curl -s -b cookies.txt http://localhost:3000/api/auth/sessions
```

**Expected 200:**
```json
{ "success": true, "sessions": [ { "id": "...", "userAgent": "...", "ipAddress": "...", "lastUsedAt": "...", "createdAt": "..." } ] }
```

---

## 14. Logout Specific Session (protected)

```bash
# Get a sessionId from step 13, then:
curl -s -b cookies.txt -X DELETE \
  "http://localhost:3000/api/auth/sessions/<SESSION_ID>"
```

**Expected 200:** `{"success":true,"message":"Session successfully logged out."}`

**Not found → 404:**
```bash
curl -s -b cookies.txt -X DELETE \
  "http://localhost:3000/api/auth/sessions/nonexistent-session-id"
```

---

## 15. Logout All Devices (protected)

```bash
curl -s -b cookies.txt -X DELETE http://localhost:3000/api/auth/sessions
```

**Expected 200:** `{"success":true,"message":"Logout all devices successful."}` — clears auth cookies.

---

## 16. Logout (current session)

```bash
curl -s -b cookies.txt -X POST http://localhost:3000/api/auth/logout
```

**Expected 200:** `{"success":true,"message":"Logout successful."}` — clears auth cookies.

---

## 17. Forgot Password

```bash
curl -s -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "john@example.com"}'
```

**Expected 200 (always — prevents enumeration):**
```json
{ "success": true, "message": "If the email is registered, a password reset link has been sent." }
```

---

## 18. Reset Password

```bash
curl -s -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "<TOKEN_FROM_EMAIL>",
    "password": "NewSecure@456"
  }'
```

**Expected 200:** `{"success":true,"message":"Password has been successfully reset."}`

**Expired token → 400:**
```bash
curl -s -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token":"expired-token","password":"NewSecure@456"}'
```

---

## Complete Login → Me → Logout Flow (one-liner script)

```bash
# Step 1: Login and save cookies
curl -s -c cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"Secure@123"}' | jq .

# Step 2: Get current user
curl -s -b cookies.txt http://localhost:3000/api/auth/me | jq .

# Step 3: Refresh tokens
curl -s -c cookies.txt -b cookies.txt -X POST http://localhost:3000/api/auth/refresh | jq .

# Step 4: Logout
curl -s -b cookies.txt -X POST http://localhost:3000/api/auth/logout | jq .

# Step 5: Try to access /me after logout (should fail)
curl -s -b cookies.txt http://localhost:3000/api/auth/me | jq .
```

> **Tip:** Install [`jq`](https://jqlang.github.io/jq/) for pretty-printed JSON output.
