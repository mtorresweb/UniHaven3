"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Role } from "@/app/generated/prisma/client";
import {
  BookOpen,
  Home,
  LogOut,
  Menu,
  Plus,
  Settings,
  Shield,
  Upload,
  User,
} from "lucide-react";

const navLinks = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/projects", label: "Proyectos", icon: BookOpen },
];

function roleBadge(role: Role) {
  if (role === Role.ADMIN)
    return <Badge variant="destructive" className="text-xs">Admin</Badge>;
  if (role === Role.UPC_STUDENT)
    return <Badge variant="secondary" className="text-xs">UPC</Badge>;
  return null;
}

function UserInitials(name?: string | null) {
  if (!name) return "U";
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function NavLinks({ onClick }: { onClick?: () => void }) {
  const pathname = usePathname();
  return (
    <>
      {navLinks.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={onClick}
          className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-accent ${
            pathname === href ? "bg-accent text-accent-foreground" : "text-muted-foreground"
          }`}
        >
          <Icon className="h-4 w-4" />
          {label}
        </Link>
      ))}
    </>
  );
}

export function Navbar() {
  const { data: session, status } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isLoading = status === "loading";
  const user = session?.user;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <BookOpen className="h-6 w-6 text-primary" />
          <span>UniHaven</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          <NavLinks />
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {!isLoading && (
            <>
              {/* Upload button — UPC students & admins */}
              {(user?.role === Role.UPC_STUDENT || user?.role === Role.ADMIN) && (
                <Button asChild size="sm" className="hidden md:flex gap-1">
                  <Link href="/projects/new">
                    <Upload className="h-4 w-4" />
                    Subir proyecto
                  </Link>
                </Button>
              )}

              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.image ?? undefined} alt={user.name ?? ""} />
                        <AvatarFallback>{UserInitials(user.name)}</AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuLabel className="flex flex-col gap-1">
                      <span className="font-medium">{user.name}</span>
                      <span className="text-xs text-muted-foreground font-normal truncate">{user.email}</span>
                      {roleBadge(user.role)}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href={`/profile/${user.id}`} className="flex gap-2">
                        <User className="h-4 w-4" /> Mi perfil
                      </Link>
                    </DropdownMenuItem>
                    {(user.role === Role.UPC_STUDENT || user.role === Role.ADMIN) && (
                      <DropdownMenuItem asChild>
                        <Link href="/projects/new" className="flex gap-2">
                          <Plus className="h-4 w-4" /> Subir proyecto
                        </Link>
                      </DropdownMenuItem>
                    )}
                    {user.role === Role.ADMIN && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href="/admin" className="flex gap-2">
                            <Shield className="h-4 w-4" /> Panel admin
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/settings" className="flex gap-2">
                        <Settings className="h-4 w-4" /> Configuración
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="flex gap-2 text-destructive focus:text-destructive"
                    >
                      <LogOut className="h-4 w-4" /> Cerrar sesión
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex gap-2">
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/login">Iniciar sesión</Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link href="/register">Registrarse</Link>
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Mobile menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64">
              <div className="flex flex-col gap-4 mt-6">
                <Link href="/" className="flex items-center gap-2 font-bold text-lg mb-2">
                  <BookOpen className="h-6 w-6 text-primary" />
                  UniHaven
                </Link>
                <NavLinks onClick={() => setMobileOpen(false)} />
                {(user?.role === Role.UPC_STUDENT || user?.role === Role.ADMIN) && (
                  <Button asChild size="sm" className="mt-2">
                    <Link href="/projects/new" onClick={() => setMobileOpen(false)}>
                      <Upload className="h-4 w-4 mr-1" /> Subir proyecto
                    </Link>
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
