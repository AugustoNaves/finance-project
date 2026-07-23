import { prisma } from "@/lib/prisma";

const TOKEN_EXPIRATION_HOURS = 1;

export async function createPasswordResetToken(userId: string, email: string) {
  const token = crypto.randomUUID();
  const expiresAt = new Date();

  expiresAt.setHours(expiresAt.getHours() + TOKEN_EXPIRATION_HOURS);

  await prisma.passwordResetToken.create({
    data: {
      email,
      token,
      expiresAt,
      userId,
    },
  });

  return token;
}

export async function validatePasswordResetToken(token: string) {
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
  });

  if (!resetToken) return null;
  if (resetToken.usedAt) return null;
  if (new Date() > resetToken.expiresAt) return null;

  return resetToken;
}

export async function markPasswordResetTokenAsUsed(token: string) {
  await prisma.passwordResetToken.update({
    where: { token },
    data: { usedAt: new Date() },
  });
}
