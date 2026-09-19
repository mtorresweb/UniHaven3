"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";
import { sendPasswordResetEmail, sendVerificationEmail } from "@/lib/email";
import prisma from "@/lib/prisma";

export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  try {
    await signIn("credentials", { email, password, redirect: false });
    return { success: true };
  } catch (e) {
    if (e instanceof AuthError) {
      return {
        error: "Credenciales inválidas. Verifica tu email y contraseña.",
      };
    }
    throw e;
  }
}

export async function registerAction(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;

  if (!name || !email || !password) {
    return { error: "Todos los campos son obligatorios." };
  }

  if (password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres." };
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return { error: "Ya existe una cuenta con este email." };
  }

  const hashed = await bcrypt.hash(password, 12);
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.pendingRegistration.deleteMany({ where: { email } });

  await prisma.pendingRegistration.create({
    data: { email, name, password: hashed, token, expiresAt },
  });

  await sendVerificationEmail(email, name, token);

  return { success: true, pending: true, email };
}

const PASSWORD_RESET_PREFIX = "password-reset:";

export async function requestPasswordResetAction(formData: FormData) {
  const email = (formData.get("email") as string)?.trim().toLowerCase();

  if (!email) {
    return { error: "Ingresa tu correo electrónico." };
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // Respondemos siempre igual para no revelar qué correos están registrados.
  // Solo enviamos el enlace si existe una cuenta con contraseña (credentials).
  if (user?.password) {
    const token = crypto.randomUUID();
    const identifier = `${PASSWORD_RESET_PREFIX}${email}`;

    // Los enlaces de recuperación no expiran. `expires` es obligatorio en el
    // modelo, así que guardamos una fecha muy lejana en lugar de una real.
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 100);

    // Un único enlace activo por correo.
    await prisma.verificationToken.deleteMany({ where: { identifier } });
    await prisma.verificationToken.create({
      data: { identifier, token, expires },
    });

    await sendPasswordResetEmail(email, user.name ?? "usuario", token);
  }

  return { success: true };
}

export async function resetPasswordAction(formData: FormData) {
  const token = (formData.get("token") as string)?.trim();
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!token) {
    return { error: "El enlace no es válido o ya fue utilizado." };
  }

  if (!password || !confirmPassword) {
    return { error: "Todos los campos son obligatorios." };
  }

  if (password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres." };
  }

  if (password !== confirmPassword) {
    return { error: "Las contraseñas no coinciden." };
  }

  const record = await prisma.verificationToken.findUnique({
    where: { token },
  });

  if (!record || !record.identifier.startsWith(PASSWORD_RESET_PREFIX)) {
    return { error: "El enlace no es válido o ya fue utilizado." };
  }

  const email = record.identifier.slice(PASSWORD_RESET_PREFIX.length);
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    await prisma.verificationToken.deleteMany({ where: { token } });
    return { error: "No encontramos una cuenta asociada a este enlace." };
  }

  const hashed = await bcrypt.hash(password, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashed },
  });

  // El enlace es de un solo uso.
  await prisma.verificationToken.deleteMany({
    where: { identifier: record.identifier },
  });

  return { success: true };
}
