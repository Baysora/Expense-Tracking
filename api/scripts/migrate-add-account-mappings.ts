/**
 * One-shot migration to bring a live DB in sync with the AccountMapping
 * schema addition. Safe to re-run (idempotent).
 *
 * Usage:
 *   cd api
 *   export DATABASE_URL="sqlserver://...prod..."
 *   npx ts-node --transpile-only scripts/migrate-add-account-mappings.ts
 */
import { PrismaClient } from "../generated/prisma-client";

const prisma = new PrismaClient();

async function exec(label: string, sql: string) {
  process.stdout.write(`• ${label} … `);
  await prisma.$executeRawUnsafe(sql);
  console.log("ok");
}

async function main() {
  console.log(
    "Starting AccountMapping migration against:",
    process.env.DATABASE_URL?.replace(/password=[^;]+/i, "password=***") ?? "<unset>"
  );

  // 1. Create AccountMapping table if missing
  await exec(
    "ensure AccountMapping table",
    `
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'AccountMapping')
    BEGIN
      CREATE TABLE [AccountMapping] (
        [id]           NVARCHAR(1000) NOT NULL,
        [accountName]  NVARCHAR(200)  NOT NULL,
        [createdAt]    DATETIME2      NOT NULL CONSTRAINT [AccountMapping_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
        [updatedAt]    DATETIME2      NOT NULL,
        [opCoId]       NVARCHAR(1000) NOT NULL,
        [categoryId]   NVARCHAR(1000) NOT NULL,
        [departmentId] NVARCHAR(1000) NOT NULL,
        CONSTRAINT [AccountMapping_pkey] PRIMARY KEY CLUSTERED ([id])
      );
    END
    `
  );

  // 2. Unique index on (opCoId, categoryId, departmentId)
  await exec(
    "ensure AccountMapping_opCoId_categoryId_departmentId_key",
    `
    IF NOT EXISTS (
      SELECT 1 FROM sys.indexes
      WHERE name = 'AccountMapping_opCoId_categoryId_departmentId_key'
        AND object_id = OBJECT_ID('AccountMapping')
    )
    BEGIN
      CREATE UNIQUE NONCLUSTERED INDEX [AccountMapping_opCoId_categoryId_departmentId_key]
        ON [AccountMapping] ([opCoId], [categoryId], [departmentId]);
    END
    `
  );

  // 3. Lookup index on opCoId (non-unique)
  await exec(
    "ensure AccountMapping_opCoId_idx",
    `
    IF NOT EXISTS (
      SELECT 1 FROM sys.indexes
      WHERE name = 'AccountMapping_opCoId_idx'
        AND object_id = OBJECT_ID('AccountMapping')
    )
    BEGIN
      CREATE NONCLUSTERED INDEX [AccountMapping_opCoId_idx]
        ON [AccountMapping] ([opCoId]);
    END
    `
  );

  // 4. Foreign keys — NoAction on both sides, matching schema.prisma
  await exec(
    "ensure AccountMapping_opCoId_fkey",
    `
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'AccountMapping_opCoId_fkey')
    BEGIN
      ALTER TABLE [AccountMapping] ADD CONSTRAINT [AccountMapping_opCoId_fkey]
        FOREIGN KEY ([opCoId]) REFERENCES [OpCo]([id])
        ON DELETE NO ACTION ON UPDATE NO ACTION;
    END
    `
  );

  await exec(
    "ensure AccountMapping_categoryId_fkey",
    `
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'AccountMapping_categoryId_fkey')
    BEGIN
      ALTER TABLE [AccountMapping] ADD CONSTRAINT [AccountMapping_categoryId_fkey]
        FOREIGN KEY ([categoryId]) REFERENCES [ExpenseCategory]([id])
        ON DELETE NO ACTION ON UPDATE NO ACTION;
    END
    `
  );

  await exec(
    "ensure AccountMapping_departmentId_fkey",
    `
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'AccountMapping_departmentId_fkey')
    BEGIN
      ALTER TABLE [AccountMapping] ADD CONSTRAINT [AccountMapping_departmentId_fkey]
        FOREIGN KEY ([departmentId]) REFERENCES [Department]([id])
        ON DELETE NO ACTION ON UPDATE NO ACTION;
    END
    `
  );

  console.log("\nDone. The prod DB now matches schema.prisma — no further `prisma db push` needed.");
}

main()
  .catch((e) => {
    console.error("\nMigration failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
