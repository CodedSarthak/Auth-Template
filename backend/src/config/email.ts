import { Resend } from "resend";

import { env } from "./getEnvVars.js";

const resend = new Resend(env.RESEND_API_KEY);

export async function sendEmail(
    toEmail: string,
    subject: string,
    htmlContent: string
) {
    try {
        const data = await resend.emails.send({
            from: env.FROM_EMAIL,
            to: toEmail,
            subject,
            html: htmlContent,
        });

        return true;
    }
    catch (error) {
        console.error("❌ Error sending email:", error);
        return false;
    }
}