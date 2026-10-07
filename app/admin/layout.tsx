import React from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Role } from "@/lib/constants";
import prisma from "@/lib/prisma";
import { AdminNav } from "@/components/admin/admin-nav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== Role.ADMIN) {
    redirect("/");
  }

  const pendingCount = await prisma.project.count({
    where: { status: { in: ["DRAFT", "IN_REVIEW", "NEEDS_REVISION"] } },
  });

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 md:flex-row md:items-start">
      <AdminNav pendingCount={pendingCount} />
      <section className="min-w-0 flex-1">{children}</section>
    </div>
  );
}
