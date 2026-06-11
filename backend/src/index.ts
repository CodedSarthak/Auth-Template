import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";

import { globalRateLimiter } from "./middleware/globalRateLimiter.js";

import userRoutes from "./modules/user/user.routes.js";

const app = express();

app.use(helmet());
app.use(globalRateLimiter);

const PORT = process.env.PORT ?? 3000;

app.use(
    cors({
        origin: "http://localhost:5173",
        credentials: true,
    })
);

app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
});

// Public auth routes (signup, login, google, refresh)
app.use("/api/auth", userRoutes);

// Add Protected routes here

app.use(
    (
        _req: express.Request,
        res: express.Response,
        _next: express.NextFunction
    ) => {
        res.status(404).json({ error: "Not found" });
    }
);

app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
});