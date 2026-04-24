/**
 * One-shot migration to bring a live DB in sync with the Department + Project
 * schema change. Safe to re-run (idempotent) — each step checks current state
 * before acting.
 *
 * Usage:
 *   cd api
 *   export DATABASE_URL="sqlserver://...prod..."
 *   npx ts-node --transpile-only scripts/migrate-add-departments.ts
 */
import { PrismaClient, Prisma } from "../generated/prisma-client";

const prisma = new PrismaClient();

async function exec(label: string, sql: string) {
  process.stdout.write(`• ${label} … `);
  await prisma.$executeRawUnsafe(sql);
  console.log("ok");
}

async function main() {
  console.log("Starting department/project migration against:", process.env.DATABASE_URL?.replace(/password=[^;]+/i, "password=***") ?? "<unset>");

  // 1. Create Department table if missing
  await exec(
    "ensure Department table",
    `
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Department')
    BEGIN
      CREATE TABLE [Department] (
        [id]     NVARCHAR(1000) NOT NULL,
        [name]   NVARCHAR(1000) NOT NULL,
        [status] NVARCHAR(1000) NOT NULL CONSTRAINT [Department_status_df] DEFAULT 'ACTIVE',
        [opCoId] NVARCHAR(1000) NOT NULL,
        CONSTRAINT [Department_pkey] PRIMARY KEY CLUSTERED ([id]),
        CONSTRAINT [Department_opCoId_name_key] UNIQUE NONCLUSTERED ([opCoId], [name])
      );
      ALTER TABLE [Department] ADD CONSTRAINT [Department_opCoId_fkey]
        FOREIGN KEY ([opCoId]) REFERENCES [OpCo]([id])
        ON DELETE NO ACTION ON UPDATE NO ACTION;
    END
    `
  );

  // 2. Add Expense.departmentId (nullable at first) and project columns
  await exec(
    "ensure Expense.departmentId column (nullable for backfill)",
    `
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE Name = 'departmentId' AND Object_ID = Object_ID('Expense'))
    BEGIN
      ALTER TABLE [Expense] ADD [departmentId] NVARCHAR(1000) NULL;
    END
    `
  );
  await exec(
    "ensure Expense.project column",
    `
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE Name = 'project' AND Object_ID = Object_ID('Expense'))
    BEGIN
      ALTER TABLE [Expense] ADD [project] NVARCHAR(1000) NULL;
    END
    `
  );

  // 3. Seed "General" department per OpCo
  const opcos = await prisma.opCo.findMany({ select: { id: true, name: true } });
  console.log(`• seeding "General" department for ${opcos.length} OpCo(s)`);
  for (const o of opcos) {
    await prisma.$executeRaw(Prisma.sql`
      IF NOT EXISTS (SELECT 1 FROM [Department] WHERE [opCoId] = ${o.id} AND [name] = 'General')
      INSERT INTO [Department] ([id], [name], [opCoId], [status])
      VALUES (LOWER(CONVERT(NVARCHAR(36), NEWID())), 'General', ${o.id}, 'ACTIVE');
    `);
    console.log(`    ↳ ${o.name}`);
  }

  // 4. Backfill existing expenses
  const backfillRows = await prisma.$executeRaw(Prisma.sql`
    UPDATE e
       SET e.[departmentId] = d.[id]
      FROM [Expense] e
      JOIN [Department] d ON d.[opCoId] = e.[opCoId] AND d.[name] = 'General'
     WHERE e.[departmentId] IS NULL;
  `);
  console.log(`• backfilled ${backfillRows} expense row(s)`);

  // 5. Flip departmentId to NOT NULL
  await exec(
    "set Expense.departmentId NOT NULL",
    `
    IF EXISTS (
      SELECT 1 FROM sys.columns
      WHERE Name = 'departmentId' AND Object_ID = Object_ID('Expense') AND is_nullable = 1
    )
    BEGIN
      ALTER TABLE [Expense] ALTER COLUMN [departmentId] NVARCHAR(1000) NOT NULL;
    END
    `
  );

  // 6. Add FK constraint if missing
  await exec(
    "ensure Expense_departmentId_fkey",
    `
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'Expense_departmentId_fkey')
    BEGIN
      ALTER TABLE [Expense] ADD CONSTRAINT [Expense_departmentId_fkey]
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
