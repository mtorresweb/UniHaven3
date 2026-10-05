import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { Search, Shield, X } from "lucide-react";
import prisma from "@/lib/prisma";
import { isUpcEmail, Role } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserRoleSelect } from "@/components/admin/user-role-select";
import { DeleteUserButton } from "@/components/admin/delete-user-button";

const ROLE_LABELS = {
  [Role.ADMIN]: "Administrador",
  [Role.UPC_STUDENT]: "Estudiante UPC",
  [Role.GENERAL]: "General",
} as const;

const VALID_ROLES = [Role.ADMIN, Role.UPC_STUDENT, Role.GENERAL] as string[];

type SearchParams = {
  q?: string;
  role?: string;
};

function formatDate(date: Date) {
  return format(date, "d 'de' MMM yyyy", { locale: es });
}

function isRole(value: string | undefined): value is Role {
  return Boolean(value) && VALID_ROLES.includes(value as string);
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const role = isRole(sp.role) ? sp.role : "";

  const users = await prisma.user.findMany({
    where: {
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { email: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(role ? { role } : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const hasFilters = Boolean(q || role);

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-primary/10 p-2 text-primary">
          <Shield className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Gestión de usuarios
          </h1>
          <p className="text-sm text-muted-foreground">
            Administra los permisos y roles de acceso dentro de UniHaven.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="gap-4">
          <CardTitle>
            Usuarios registrados{" "}
            <span className="text-sm font-normal text-muted-foreground">
              ({users.length}
              {hasFilters ? " encontrados" : ""})
            </span>
          </CardTitle>

          {/* Filtros — se envían por la URL, sin JS de cliente */}
          <form
            method="GET"
            className="flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="q"
                defaultValue={q}
                placeholder="Buscar por nombre o email…"
                className="pl-9"
              />
            </div>
            <Select name="role" defaultValue={role || "all"}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los roles</SelectItem>
                <SelectItem value={Role.ADMIN}>Administrador</SelectItem>
                <SelectItem value={Role.UPC_STUDENT}>Estudiante UPC</SelectItem>
                <SelectItem value={Role.GENERAL}>General</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" className="w-full sm:w-auto">
              Buscar
            </Button>
            {hasFilters && (
              <Button asChild variant="ghost" className="w-full sm:w-auto">
                <Link href="/admin/users">
                  <X className="mr-1.5 h-3.5 w-3.5" />
                  Limpiar
                </Link>
              </Button>
            )}
          </form>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Registrado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No se encontraron usuarios con esos criterios.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.name || "Sin nombre"}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{ROLE_LABELS[user.role]}</TableCell>
                    <TableCell>{formatDate(user.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-2">
                        <UserRoleSelect
                          userId={user.id}
                          currentRole={user.role}
                          isUpc={isUpcEmail(user.email)}
                        />
                        {user.role !== Role.ADMIN && (
                          <DeleteUserButton
                            userId={user.id}
                            userName={user.name || user.email}
                          />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
