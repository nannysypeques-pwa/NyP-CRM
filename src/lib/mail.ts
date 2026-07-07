import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

interface MailConfig {
  host?: string;
  port?: number;
  secure?: boolean;
  auth?: {
    user: string;
    pass: string;
  };
}

export async function sendOtpEmail(email: string, code: string): Promise<{ sent: boolean; method: "smtp" | "local-log" }> {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || '"NyP CRM Security" <no-reply@nannysypeques.com>';

  const isSmtpConfigured = host && port && user && pass;

  if (isSmtpConfigured) {
    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465, // True for port 465, false for other ports (like 587)
        auth: {
          user,
          pass,
        },
      } as MailConfig);

      await transporter.sendMail({
        from,
        to: email,
        subject: "Código de Verificación OTP - NyP CRM",
        text: `Tu código de verificación OTP para restablecer tu contraseña es: ${code}. Este código expira en 10 minutos.`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; border: 1px solid #e2edf6; border-radius: 12px; padding: 24px; background-color: #fff;">
              <h2 style="color: #026692; margin-top: 0;">Restablecer Contraseña - NyP CRM</h2>
              <p>Hola,</p>
              <p>Has solicitado restablecer tu contraseña para acceder al portal de NyP CRM. Utiliza el siguiente código OTP para proceder con la verificación:</p>
              <div style="text-align: center; margin: 30px 0;">
                <span style="font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #026692; background-color: #f4f8fc; padding: 12px 24px; border-radius: 8px; border: 1px dashed #b9d8e8;">${code}</span>
              </div>
              <p style="font-size: 13px; color: #666;">Este código es de un solo uso y expirará en <strong>10 minutos</strong>. Si tú no realizaste esta solicitud, puedes ignorar este correo de forma segura.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
              <p style="font-size: 11px; color: #999; text-align: center;">Este es un mensaje automático de seguridad. Por favor no respondas a este correo.</p>
            </div>
          </div>
        `,
      });

      console.log(`[SMTP] OTP sent successfully to ${email}`);
      return { sent: true, method: "smtp" };
    } catch (error) {
      console.error("[SMTP] Error sending email via SMTP, falling back to local logging:", error);
    }
  }

  // Fallback to local logging (for local development/testing)
  const logMessage = `[${new Date().toISOString()}] OTP para ${email}: ${code}\n`;
  const logPath = path.join(process.cwd(), "otp-log.txt");

  try {
    fs.appendFileSync(logPath, logMessage, "utf8");
    console.log(`[LOCAL] OTP logged locally in otp-log.txt for ${email}: ${code}`);
    return { sent: true, method: "local-log" };
  } catch (err) {
    console.error("Error writing OTP to local log file:", err);
    return { sent: false, method: "local-log" };
  }
}
