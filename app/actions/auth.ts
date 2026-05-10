"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Role } from "@/app/generated/prisma/client";

const UPC_DOMAIN = "unicesar.edu.co";

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

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Ya existe una cuenta con este email." };
  }

  const hashed = await bcrypt.hash(password, 12);
  const role = email.endsWith(`@${UPC_DOMAIN}`) ? Role.UPC_STUDENT : Role.GENERAL;

  await prisma.user.create({
    data: { name, email, password: hashed, role },
  });

  // Auto-login after register
  try {
    await signIn("credentials", { email, password, redirect: false });
    return { success: true };
  } catch {
    return { success: true, redirect: "/login" };
  }
}
