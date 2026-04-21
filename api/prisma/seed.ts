import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("Admin@123!", 12);

  // ── HoldCo Internal OpCo ─────────────────────────────────────────────────
  const holdco = await prisma.opCo.upsert({
    where: { slug: "baysora-holdco" },
    update: {},
    create: { name: "Baysora HoldCo", slug: "baysora-holdco", isHoldCo: true, isActive: true },
  });

  // ── OpCos ─────────────────────────────────────────────────────────────────
  const acme = await prisma.opCo.upsert({
    where: { slug: "acme-corp" },
    update: {},
    create: { name: "Acme Corp", slug: "acme-corp", isActive: true },
  });

  const globex = await prisma.opCo.upsert({
    where: { slug: "globex-inc" },
    update: {},
    create: { name: "Globex Inc", slug: "globex-inc", isActive: true },
  });

  // ── HoldCo Users ──────────────────────────────────────────────────────────
  await prisma.user.upsert({
    where: { email: "admin@holdco.com" },
    update: {},
    create: {
      email: "admin@holdco.com",
      name: "HoldCo Administrator",
      passwordHash: password,
      role: "HOLDCO_ADMIN",
      opCoId: null,
    },
  });

  await prisma.user.upsert({
    where: { email: "holdco.user@holdco.com" },
    update: {},
    create: {
      email: "holdco.user@holdco.com",
      name: "HoldCo Employee",
      passwordHash: password,
      role: "HOLDCO_USER",
      opCoId: null,
    },
  });

  // ── Acme Users ────────────────────────────────────────────────────────────
  await prisma.user.upsert({
    where: { email: "opco.admin@acme.com" },
    update: {},
    create: { email: "opco.admin@acme.com", name: "Acme Admin", passwordHash: password, role: "OPCO_ADMIN", opCoId: acme.id },
  });

  await prisma.user.upsert({
    where: { email: "manager@acme.com" },
    update: {},
    create: { email: "manager@acme.com", name: "Acme Manager", passwordHash: password, role: "OPCO_MANAGER", opCoId: acme.id },
  });

  await prisma.user.upsert({
    where: { email: "alice@acme.com" },
    update: {},
    create: { email: "alice@acme.com", name: "Alice Smith", passwordHash: password, role: "OPCO_USER", opCoId: acme.id },
  });

  await prisma.user.upsert({
    where: { email: "bob@acme.com" },
    update: {},
    create: { email: "bob@acme.com", name: "Bob Jones", passwordHash: password, role: "OPCO_USER", opCoId: acme.id },
  });

  // ── Globex Users ──────────────────────────────────────────────────────────
  await prisma.user.upsert({
    where: { email: "opco.admin@globex.com" },
    update: {},
    create: { email: "opco.admin@globex.com", name: "Globex Admin", passwordHash: password, role: "OPCO_ADMIN", opCoId: globex.id },
  });

  await prisma.user.upsert({
    where: { email: "manager@globex.com" },
    update: {},
    create: { email: "manager@globex.com", name: "Globex Manager", passwordHash: password, role: "OPCO_MANAGER", opCoId: globex.id },
  });

  await prisma.user.upsert({
    where: { email: "carol@globex.com" },
    update: {},
    create: { email: "carol@globex.com", name: "Carol White", passwordHash: password, role: "OPCO_USER", opCoId: globex.id },
  });

  // ── Shared Categories (under HoldCo Internal) ─────────────────────────────
  const sharedCategories = [
    "Corporate Travel",
    "Executive Meals",
    "Corporate Software",
    "Training & Development",
    "Office Supplies",
  ];
  for (const name of sharedCategories) {
    await prisma.expenseCategory.upsert({
      where: { opCoId_name: { opCoId: holdco.id, name } },
      update: {},
      create: { name, opCoId: holdco.id, isShared: true },
    });
  }

  // ── Acme Categories ───────────────────────────────────────────────────────
  const acmeCategories = ["Travel", "Meals & Entertainment", "Software & Subscriptions", "Office Supplies", "Training"];
  for (const name of acmeCategories) {
    await prisma.expenseCategory.upsert({
      where: { opCoId_name: { opCoId: acme.id, name } },
      update: {},
      create: { name, opCoId: acme.id },
    });
  }

  // ── Globex Categories ─────────────────────────────────────────────────────
  const globexCategories = ["Travel", "Client Entertainment", "Equipment", "Marketing", "Consulting Fees"];
  for (const name of globexCategories) {
    await prisma.expenseCategory.upsert({
      where: { opCoId_name: { opCoId: globex.id, name } },
      update: {},
      create: { name, opCoId: globex.id },
    });
  }

  // ── Sample Expenses for Alice ──────────────────────────────────────────────
  const alice = await prisma.user.findUniqueOrThrow({ where: { email: "alice@acme.com" } });
  const manager = await prisma.user.findUniqueOrThrow({ where: { email: "manager@acme.com" } });
  const travelCat = await prisma.expenseCategory.findFirstOrThrow({ where: { opCoId: acme.id, name: "Travel" } });
  const mealsCat = await prisma.expenseCategory.findFirstOrThrow({ where: { opCoId: acme.id, name: "Meals & Entertainment" } });

  await prisma.expense.upsert({
    where: { id: "seed-expense-draft-001" },
    update: {},
    create: {
      id: "seed-expense-draft-001",
      title: "Flight to NYC Conference",
      description: "Round-trip flight for Q1 sales conference",
      amount: 485.00,
      currency: "USD",
      status: "DRAFT",
      categoryId: travelCat.id,
      submittedById: alice.id,
      opCoId: acme.id,
    },
  });

  await prisma.expense.upsert({
    where: { id: "seed-expense-submitted-001" },
    update: {},
    create: {
      id: "seed-expense-submitted-001",
      title: "Team Lunch",
      description: "Lunch with product team",
      amount: 127.50,
      currency: "USD",
      status: "SUBMITTED",
      categoryId: mealsCat.id,
      submittedById: alice.id,
      opCoId: acme.id,
    },
  });

  const approvedExpense = await prisma.expense.upsert({
    where: { id: "seed-expense-approved-001" },
    update: {},
    create: {
      id: "seed-expense-approved-001",
      title: "Hotel — NYC Conference",
      description: "2 nights at Marriott",
      amount: 398.00,
      currency: "USD",
      status: "APPROVED",
      categoryId: travelCat.id,
      submittedById: alice.id,
      opCoId: acme.id,
    },
  });

  const rejectedExpense = await prisma.expense.upsert({
    where: { id: "seed-expense-rejected-001" },
    update: {},
    create: {
      id: "seed-expense-rejected-001",
      title: "Team Dinner",
      description: "Dinner for 8 people",
      amount: 634.20,
      currency: "USD",
      status: "REJECTED",
      categoryId: mealsCat.id,
      submittedById: alice.id,
      opCoId: acme.id,
    },
  });

  await prisma.approvalRecord.upsert({
    where: { id: "seed-approval-001" },
    update: {},
    create: { id: "seed-approval-001", action: "APPROVED", comment: "Approved — within policy.", expenseId: approvedExpense.id, reviewedById: manager.id },
  });

  await prisma.approvalRecord.upsert({
    where: { id: "seed-approval-002" },
    update: {},
    create: { id: "seed-approval-002", action: "REJECTED", comment: "Exceeds $500 meals limit. Please split and resubmit.", expenseId: rejectedExpense.id, reviewedById: manager.id },
  });

  console.log("\nSeeded successfully! All accounts use password: Admin@123!\n");
  console.log("┌──────────────────────────────┬───────────────────┬────────────────┐");
  console.log("│ Email                        │ Role              │ OpCo           │");
  console.log("├──────────────────────────────┼───────────────────┼────────────────┤");
  console.log("│ admin@holdco.com             │ HOLDCO_ADMIN      │ —              │");
  console.log("│ holdco.user@holdco.com       │ HOLDCO_USER       │ —              │");
  console.log("│ opco.admin@acme.com          │ OPCO_ADMIN        │ Acme Corp      │");
  console.log("│ manager@acme.com             │ OPCO_MANAGER      │ Acme Corp      │");
  console.log("│ alice@acme.com               │ OPCO_USER         │ Acme Corp      │");
  console.log("│ bob@acme.com                 │ OPCO_USER         │ Acme Corp      │");
  console.log("│ opco.admin@globex.com        │ OPCO_ADMIN        │ Globex Inc     │");
  console.log("│ manager@globex.com           │ OPCO_MANAGER      │ Globex Inc     │");
  console.log("│ carol@globex.com             │ OPCO_USER         │ Globex Inc     │");
  console.log("└──────────────────────────────┴───────────────────┴────────────────┘");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
