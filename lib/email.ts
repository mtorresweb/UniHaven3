import "server-only";

import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS, // App Password de Gmail
  },
});

export async function sendVerificationEmail(to: string, name: string, token: string) {
  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`;

  await transporter.sendMail({
    from: `UniHaven <${process.env.SMTP_USER}>`,
    to,
    subject: "Confirma tu cuenta en UniHaven",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h1 style="font-size: 24px; font-weight: 700; margin-bottom: 8px;">¡Bienvenido a UniHaven, ${name}!</h1>
        <p style="color: #555; margin-bottom: 24px;">
          Confirma tu dirección de correo para activar tu cuenta.
          Este enlace expira en <strong>24 horas</strong>.
        </p>
        <a href="${verifyUrl}"
           style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px;
                  border-radius: 6px; text-decoration: none; font-weight: 600;">
          Confirmar cuenta
        </a>
        <p style="color: #999; font-size: 12px; margin-top: 24px;">
          Si no solicitaste esta cuenta, puedes ignorar este correo.<br/>
          O copia este enlace: ${verifyUrl}
        </p>
      </div>
    `,
  });
}
