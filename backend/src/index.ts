import "dotenv/config";
import { app } from "./app.js";
import { env } from "./config/getEnvVars.js";

const PORT = env.PORT ?? 3000;

app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
});