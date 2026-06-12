import { Resend } from "resend";

import { env } from "./getEnvVars.js";

const resend = new Resend(env.RESEND_API_KEY);

export async function sendEmail(
    toEmail: string,
    subject: string,
    htmlContent: string
): Promise<void> {
    const { error } = await resend.emails.send({
        from: env.FROM_EMAIL,
        to: toEmail,
        subject,
        html: htmlContent,
    });

    if (error) {
        throw new Error(`Failed to send email to ${toEmail}: ${error.message}`);
    }
}