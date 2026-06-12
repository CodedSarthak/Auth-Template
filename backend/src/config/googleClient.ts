import { env } from "./getEnvVars.js";
import { OAuth2Client } from "google-auth-library";

export const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);