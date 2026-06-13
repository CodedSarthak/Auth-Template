import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";

import { globalRateLimiter } from "./middleware/globalRateLimiter.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { env } from "./config/getEnvVars.js";

import userRoutes from "./modules/user/user.routes.js";

export const app = express();

app.use(helmet());
app.use(requestLogger);
app.use(globalRateLimiter);

// app.use(
//     cors({
//         origin: env.FRONTEND_URL,
//         credentials: true,
//     })
// );

app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
});

app.use("/api/auth", userRoutes);

// 404 handler
app.use(
    (
        _req: express.Request,
        res: express.Response,
        _next: express.NextFunction
    ) => {
        res.status(404).json({ error: "Not found" });
    }
);

app.use(errorHandler);
