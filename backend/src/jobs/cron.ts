import cron from "node-cron";
import { UserRepository } from "../modules/user/user.repository.js";
import { logger } from "../config/logger.js";

// Run every day at midnight
export const initCronJobs = () => {
    cron.schedule("0 0 * * *", async () => {
        logger.info("Running routine database cleanup...");
        try {
            const result = await UserRepository.deleteExpiredTokens();
            logger.info(`Cleanup complete. Deleted: ${result.sessions} sessions, ${result.emailTokens} email tokens, ${result.passwordTokens} password reset tokens.`);
        } catch (error) {
            logger.error(error, "Error during database cleanup");
        }
    });
};
