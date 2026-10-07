"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Flag, Inbox, Megaphone, Shield, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/admin", label: "Reportes", icon: Flag },
  { href: "/admin/review", label: "Revisión", icon: Inbox },
  { href: "/admin/users", label: "Usuarios", icon: Users },
  { href: "/admin/projects", label: "Proyectos", icon: BookOpen },
  { href: "/admin/announcements", label: "Anuncios", icon: Megaphone },
] as const;

export function AdminNav({ pendingCount = 0 }: { pendingCount?: number }) {
  const pathname = usePathname();

  return (
    <aside className="w-full rounded-2xl border bg-card p-4 md:sticky md:top-20 md:w-64 md:self-start">
      <div className="mb-4 flex items-center gap-2 px-2">
        <Shield className="h-4 w-4 text-primary" />
        <div>
          <p className="text-sm font-semibold">Panel de administración</p>
          <p className="text-xs text-muted-foreground">Gestión de UniHaven</p>
        </div>
      </div>

      <nav className="space-y-1">
        {items.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted",
                isActive
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
              {item.href === "/admin/review" && pendingCount > 0 && (
                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-yellow-500/15 px-1.5 text-xs font-semibold text-yellow-700 dark:text-yellow-400">
                  {pendingCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
