import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  if (!process.env.EMAIL_FROM) {
    throw new Error("EMAIL_FROM não configurado.");
  }

  return resend.emails.send({
    from: process.env.EMAIL_FROM,
    to,
    subject: "Redefinição de senha — Finanças Pessoais",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #111827;">
        <h2 style="color: #00c48c;">Redefinição de senha</h2>
        <p>Recebemos uma solicitação para redefinir a senha da sua conta.</p>
        <p>Clique no botão abaixo para criar uma nova senha. O link é válido por 1 hora.</p>
        <a
          href="${resetUrl}"
          style="display: inline-block; margin: 16px 0; padding: 12px 24px; background: #00c48c; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600;"
        >
          Redefinir senha
        </a>
        <p style="font-size: 12px; color: #6b7280;">
          Se você não solicitou a redefinição, ignore este email.
        </p>
      </div>
    `,
    text: `Recebemos uma solicitação para redefinir sua senha. Acesse o link para continuar: ${resetUrl}. O link é válido por 1 hora. Se você não solicitou, ignore este email.`,
  });
}
