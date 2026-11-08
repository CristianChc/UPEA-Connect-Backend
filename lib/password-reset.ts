import { hash, compare } from "bcryptjs";
import { randomInt } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetCode } from "@/lib/email";
import { hashPassword } from "@/lib/auth";
import { ApiError } from "@/lib/api-response";

const CODE_TTL_MS = 15 * 60 * 1000; // 15 minutos
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 segundos
const MAX_ATTEMPTS = 5;

function generateCode(): string {
  return randomInt(100000, 1000000).toString();
}

function ERROR_GENERICO(): ApiError {
  return new ApiError("INVALID_OR_EXPIRED_CODE", "Código inválido o expirado", 400);
}

/**
 * Busca un usuario tolerante a mayúsculas/minúsculas.
 * Primero intenta coincidencia exacta; si falla, busca sin distinguir mayúsculas.
 * Devuelve el registro tal como está guardado (con su email original).
 */
async function buscarUsuarioPorEmail(email: string) {
  const emailTrim = email.trim();

  let user = await prisma.user.findUnique({ where: { email: emailTrim } });
  if (!user) {
    user = await prisma.user.findFirst({
      where: { email: { equals: emailTrim, mode: "insensitive" } },
    });
  }

  return user;
}

/**
 * Solicita un código de restablecimiento de contraseña.
 * Si el usuario NO existe, o si ya se envió un código hace menos de 60 s,
 * no envía nada y no lanza error (no revela si el correo está registrado).
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await buscarUsuarioPorEmail(email);
  if (!user) {
    return;
  }

  const existing = await prisma.passwordReset.findUnique({ where: { userId: user.id } });

  if (existing) {
    const elapsed = Date.now() - existing.lastSentAt.getTime();
    if (elapsed < RESEND_COOLDOWN_MS) {
      return; // enfriamiento: no reenvía, no lanza error
    }
  }

  const code = generateCode();
  const codeHash = await hash(code, 10);
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);

  await prisma.passwordReset.upsert({
    where: { userId: user.id },
    create: { userId: user.id, codeHash, expiresAt },
    update: { codeHash, expiresAt, attempts: 0, lastSentAt: new Date() },
  });

  try {
    await sendPasswordResetCode(user.email, code);
  } catch (err) {
    console.error("[password-reset] error al enviar el correo:", err);
    await prisma.passwordReset.delete({ where: { userId: user.id } }).catch(() => {});
    // No relanza: la función termina sin revelar nada.
  }
}

/**
 * Restablece la contraseña. Cualquier fallo devuelve el mismo error genérico
 * para no revelar si el correo o el código existen.
 */
export async function resetPassword(email: string, code: string, newPassword: string): Promise<void> {
  const user = await buscarUsuarioPorEmail(email);
  if (!user) {
    throw ERROR_GENERICO();
  }

  const record = await prisma.passwordReset.findUnique({ where: { userId: user.id } });
  if (!record) {
    throw ERROR_GENERICO();
  }

  // Intento atómico: solo incrementa si aún no se agotaron y no expiró.
  const updateResult = await prisma.passwordReset.updateMany({
    where: {
      userId: user.id,
      attempts: { lt: MAX_ATTEMPTS },
      expiresAt: { gt: new Date() },
    },
    data: { attempts: { increment: 1 } },
  });

  if (updateResult.count === 0) {
    throw ERROR_GENERICO();
  }

  const isValid = await compare(code, record.codeHash);

  if (!isValid) {
    throw ERROR_GENERICO();
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { password: await hashPassword(newPassword) } }),
    prisma.passwordReset.delete({ where: { userId: user.id } }),
  ]);
}
