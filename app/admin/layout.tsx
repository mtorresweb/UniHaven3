import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Role } from "@/lib/constants";
import { AdminNav } from "@/components/admin/admin-nav";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const session = await auth();

  if (!session?.user || session.user.role !== Role.ADMIN) {
    redirect("/login");
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 md:flex-row md:items-start">
      <AdminNav />
      <section className="min-w-0 flex-1">{children}</section>
    </div>
  );
}
