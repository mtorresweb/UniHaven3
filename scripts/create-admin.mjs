import bcrypt from "bcryptjs";
import { neon } from "@neondatabase/serverless";

const DEFAULT_EMAIL = "mstictorres@unicesar.edu.co";
const DEFAULT_NAME = "Michael T";
const DEFAULT_PASSWORD = "Suave123@";

const [email = DEFAULT_EMAIL, name = DEFAULT_NAME, password = DEFAULT_PASSWORD] =
  process.argv
    .slice(2)
    .map((arg) => arg.trim())
    .filter(Boolean);

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("\n✖ Falta la variable de entorno DATABASE_URL.");
  console.error(
    '  Ejecuta con:  node --env-file=.env scripts/create-admin.mjs\n' +
      "  o usa el script de npm:  npm run create-admin\n",
  );
  process.exit(1);
}

const normalizedEmail = email.toLowerCase();
const sql = neon(databaseUrl);

const existing = await sql`
  SELECT id, role
  FROM "User"
  WHERE email = ${normalizedEmail}
  LIMIT 1
`;

if (existing.length > 0) {
  await sql`
    UPDATE "User"
    SET role = 'ADMIN'::"Role", suspended = false, "updatedAt" = now()
    WHERE email = ${normalizedEmail}
  `;

  console.log(`\n✔ El usuario ya existía: ${normalizedEmail}`);
  console.log(`  Rol actualizado a ADMIN (rol anterior: ${existing[0].role}).`);
  console.log("  No se modificaron el nombre ni la contraseña.");
} else {
  const id = crypto.randomUUID();
  const passwordHash = await bcrypt.hash(password, 12);

  await sql`
    INSERT INTO "User" (
      id, name, email, "emailVerified", password, role, suspended, "createdAt", "updatedAt"
    )
    VALUES (
      ${id}, ${name}, ${normalizedEmail}, now(), ${passwordHash}, 'ADMIN'::"Role", false, now(), now()
    )
  `;

  console.log(`\n✔ Usuario creado como ADMIN: ${normalizedEmail}`);
  console.log("  Ya puedes iniciar sesión con la contraseña indicada.");
}

console.log("  Entra a /login para iniciar sesión.\n");
