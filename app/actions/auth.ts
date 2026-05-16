"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";
import prisma from "@/lib/prisma";

export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  try {
    await signIn("credentials", { email, password, redirect: false });
    return { success: true };
  } catch (e) {
    if (e instanceof AuthError) {
      return { error: "Credenciales inválidas. Verifica tu email y contraseña." };
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
