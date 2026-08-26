import { hash, compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendVerificationCode } from "@/lib/email";
import { ApiError } from "@/lib/api-response";

const CODE_TTL_MS = 15 * 60 * 1000;
const RESEND_COOLDOWN_MS = 30 * 1000;
const MAX_ATTEMPTS = 5;

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function createAndSendVerification(userId: string, email: string): Promise<void> {
  const code = generateCode();
  const codeHash = await hash(code, 10);
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);

  await prisma.emailVerification.upsert({
    where: { userId },
    create: { userId, codeHash, expiresAt },
    update: { codeHash, expiresAt, attempts: 0, lastSentAt: new Date() },
  });

  await sendVerificationCode(email, code);
}

export async function resendVerification(userId: string, email: string): Promise<void> {
  const existing = await prisma.emailVerification.findUnique({ where: { userId } });

  if (existing) {
    const elapsed = Date.now() - existing.lastSentAt.getTime();
    if (elapsed < RESEND_COOLDOWN_MS) {
      const wait = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
      throw new ApiError("RESEND_COOLDOWN", `Espera ${wait}s antes de reenviar`, 429);
    }
  }

  await createAndSendVerification(userId, email);
}

export async function verifyCode(userId: string, code: string): Promise<void> {
  const record = await prisma.emailVerification.findUnique({ where: { userId } });

  if (!record) {
    throw new ApiError("NO_VERIFICATION_PENDING", "No hay verificación pendiente", 400);
  }

  if (record.expiresAt < new Date()) {
    throw new ApiError("CODE_EXPIRED", "El código expiró, solicita uno nuevo", 400);
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    throw new ApiError("TOO_MANY_ATTEMPTS", "Demasiados intentos, solicita un código nuevo", 429);
  }

  const isValid = await compare(code, record.codeHash);

  if (!isValid) {
    await prisma.emailVerification.update({
      where: { userId },
      data: { attempts: { increment: 1 } },
    });
    throw new ApiError("INVALID_CODE", "Código incorrecto", 400);
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { emailVerified: true } }),
    prisma.emailVerification.delete({ where: { userId } }),
  ]);
}