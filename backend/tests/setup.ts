// Must run BEFORE any source module is imported.
// Vitest executes setupFiles before loading test module imports.
process.env.DATABASE_URL        = "postgresql://test:test@localhost:5432/testdb";
process.env.REDIS_URL           = "redis://localhost:6379";
process.env.JWT_ACCESS_SECRET   = "test-access-secret-at-least-32-characters!!";
process.env.JWT_ACCESS_EXPIRATION  = "15m";
process.env.JWT_REFRESH_SECRET  = "test-refresh-secret-at-least-32-chars!!";
process.env.JWT_REFRESH_EXPIRATION = "7d";
process.env.GOOGLE_CLIENT_ID    = "test-google-client-id.apps.googleusercontent.com";
process.env.TOKEN_EXPIRATION_TIME  = "60";
process.env.RESEND_API_KEY      = "re_test_key";
process.env.FROM_EMAIL          = "test@example.com";
process.env.NODE_ENV            = "test";
process.env.PORT                = "3001";
process.env.FRONTEND_URL        = "http://localhost:5173";
process.env.AWS_ACCESS_KEY_ID   = "AKIATEST000000000000";
process.env.AWS_SECRET_ACCESS_KEY = "testSecretAccessKey00000000000000000000";
process.env.AWS_REGION          = "us-east-1";
process.env.S3_BUCKET           = "test-bucket";
