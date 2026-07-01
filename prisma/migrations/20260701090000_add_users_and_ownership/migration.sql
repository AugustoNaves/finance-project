CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

INSERT INTO "users" ("id", "name", "email", "passwordHash", "createdAt", "updatedAt")
VALUES (
    'initial-user',
    'Usuário Inicial',
    'usuario.inicial@example.com',
    '$2a$10$initialHashMustBeReplacedAfterMigration',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("email") DO NOTHING;

ALTER TABLE "transactions" ADD COLUMN "userId" TEXT;
ALTER TABLE "categories" ADD COLUMN "userId" TEXT;
ALTER TABLE "budgets" ADD COLUMN "userId" TEXT;

UPDATE "transactions" SET "userId" = 'initial-user' WHERE "userId" IS NULL;
UPDATE "categories" SET "userId" = 'initial-user' WHERE "userId" IS NULL;
UPDATE "budgets" SET "userId" = 'initial-user' WHERE "userId" IS NULL;

ALTER TABLE "transactions" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "categories" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "budgets" ALTER COLUMN "userId" SET NOT NULL;

CREATE INDEX "transactions_userId_idx" ON "transactions"("userId");
CREATE INDEX "categories_userId_idx" ON "categories"("userId");
CREATE INDEX "budgets_userId_idx" ON "budgets"("userId");

ALTER TABLE "categories" ADD CONSTRAINT "categories_userId_name_type_key" UNIQUE ("userId", "name", "type");
ALTER TABLE "budgets" DROP CONSTRAINT IF EXISTS "budgets_category_month_key";
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_userId_category_month_key" UNIQUE ("userId", "category", "month");

ALTER TABLE "transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "categories" ADD CONSTRAINT "categories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
