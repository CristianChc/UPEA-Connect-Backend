import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER!,
    pass: process.env.GMAIL_APP_PASSWORD!,
  },
});

export async function sendVerificationCode(email: string, code: string): Promise<void> {
  const info = await transporter.sendMail({
    from: `"UPEA-Connect" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: "Tu código de verificación — UPEA-Connect",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Verifica tu correo</h2>
        <p>Tu código de verificación es:</p>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px;">${code}</p>
        <p>Este código expira en 15 minutos. Si no solicitaste esto, ignora este correo.</p>
      </div>
    `,
  });
  console.log("Correo enviado:", info.messageId, info.response);
}