import { Pool } from "pg";
import { getDatabaseConfig } from "./env";

let pool: Pool | undefined;

function getPool() {
  if (!pool) {
    pool = new Pool({ connectionString: getDatabaseConfig().url, max: 2 });
  }

  return pool;
}

export async function closeDb() {
  await pool?.end();
  pool = undefined;
}

export async function getPasswordHash(email: string) {
  const result = await getPool().query<{ passwordHash: string }>(
    'select "passwordHash" from users where email = $1',
    [email.toLowerCase()],
  );

  return result.rows[0]?.passwordHash ?? null;
}

export type ResetTokenRow = {
  token: string;
  /** Minutos até expirar (negativo = expirado), calculado no banco em UTC. */
  minutesToExpire: number;
  used: boolean;
};

export async function getResetTokens(email: string) {
  const result = await getPool().query<ResetTokenRow>(
    // As colunas são `timestamp` sem fuso gravadas em UTC pelo Prisma; a conta é
    // feita no SQL para não depender do fuso do processo de teste.
    `select token,
            (extract(epoch from ("expiresAt" - (now() at time zone 'utc'))) / 60)::float8 as "minutesToExpire",
            ("usedAt" is not null) as used
       from password_reset_tokens
      where email = $1
      order by "createdAt" desc`,
    [email.toLowerCase()],
  );

  return result.rows;
}

export async function expireResetToken(token: string) {
  await getPool().query(
    `update password_reset_tokens set "expiresAt" = (now() at time zone 'utc') - interval '1 minute' where token = $1`,
    [token],
  );
}

export async function countRows(table: "users" | "transactions" | "categories" | "budgets" | "goals", userEmail: string) {
  if (table === "users") {
    const result = await getPool().query<{ count: string }>(
      "select count(*)::text as count from users where email = $1",
      [userEmail.toLowerCase()],
    );

    return Number(result.rows[0].count);
  }

  const result = await getPool().query<{ count: string }>(
    `select count(*)::text as count from ${table} t join users u on u.id = t."userId" where u.email = $1`,
    [userEmail.toLowerCase()],
  );

  return Number(result.rows[0].count);
}

/**
 * Cria um usuário copiando o "usuário modelo" que o global-setup cadastrou pela
 * API real (/api/register): mesmo hash de senha e as mesmas categorias padrão.
 * Evita rodar bcrypt (12 rounds em JS puro, ~0,8s de CPU bloqueando o event
 * loop do `next dev`) uma vez por teste — era a principal fonte de lentidão.
 */
export async function cloneTemplateUser(templateUserId: string, user: { name: string; email: string }) {
  const client = await getPool().connect();

  try {
    await client.query("begin");

    const inserted = await client.query<{ id: string }>(
      `insert into users (id, name, email, "passwordHash", "createdAt", "updatedAt")
       select gen_random_uuid(), $2, $3, "passwordHash", now() at time zone 'utc', now() at time zone 'utc'
         from users where id = $1
       returning id`,
      [templateUserId, user.name, user.email.toLowerCase()],
    );

    if (inserted.rowCount !== 1) {
      throw new Error(`[e2e] Usuário modelo ${templateUserId} não encontrado.`);
    }

    const id = inserted.rows[0].id;

    await client.query(
      `insert into categories (id, name, type, color, icon, "userId", "createdAt", "updatedAt")
       select gen_random_uuid(), name, type, color, icon, $2, now() at time zone 'utc', now() at time zone 'utc'
         from categories where "userId" = $1`,
      [templateUserId, id],
    );
    await client.query("commit");

    return id;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
