import "dotenv/config";
import { app } from "./app.js";
import { env } from "./config/getEnvVars.js";
import { initCronJobs } from "./jobs/cron.js";

const PORT = env.PORT ?? 3000;

// Initialize background tasks for cleanup
initCronJobs();

app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
});