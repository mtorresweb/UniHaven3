"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { setUserRole } from "@/app/actions/admin";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ROLE_LABELS = {
  GENERAL: "General",
  UPC_STUDENT: "Estudiante UPC",
  ADMIN: "Administrador",
} as const;

type UserRole = keyof typeof ROLE_LABELS;

interface UserRoleSelectProps {
  userId: string;
  currentRole: UserRole;
}

export function UserRoleSelect({
  userId,
  currentRole,
}: UserRoleSelectProps) {
  const [value, setValue] = useState<UserRole>(currentRole);
  const [isPending, startTransition] = useTransition();

  function handleChange(nextRole: UserRole) {
    if (nextRole === value) {
      return;
    }

    const previousRole = value;
    setValue(nextRole);

    startTransition(async () => {
      const result = await setUserRole(userId, nextRole);

      if (result.error) {
        setValue(previousRole);
        toast.error(result.error);
        return;
      }

      toast.success("Rol actualizado correctamente.");
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={value} onValueChange={(next) => handleChange(next as UserRole)}>
        <SelectTrigger size="sm" className="min-w-40" disabled={isPending}>
          <SelectValue placeholder="Selecciona un rol" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(ROLE_LABELS).map(([role, label]) => (
            <SelectItem key={role} value={role}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
    </div>
  );
}
