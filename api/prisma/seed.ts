import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("Admin@123!", 12);

  // ── OpCos ────────────────────────────────────────────────────────────────

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

  // ── Users ─────────────────────────────────────────────────────────────────

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
    where: { email: "opco.admin@acme.com" },
    update: {},
    create: {
      email: "opco.admin@acme.com",
      name: "Acme Admin",
      passwordHash: password,
      role: "OPCO_ADMIN",
      opCoId: acme.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "manager@acme.com" },
    update: {},
    create: {
      email: "manager@acme.com",
      name: "Acme Manager",
      passwordHash: password,
      role: "OPCO_MANAGER",
      opCoId: acme.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "alice@acme.com" },
    update: {},
    create: {
      email: "alice@acme.com",
      name: "Alice Smith",
      passwordHash: password,
      role: "OPCO_USER",
      opCoId: acme.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "bob@acme.com" },
    update: {},
    create: {
      email: "bob@acme.com",
      name: "Bob Jones",
      passwordHash: password,
      role: "OPCO_USER",
      opCoId: acme.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "opco.admin@globex.com" },
    update: {},
    create: {
      email: "opco.admin@globex.com",
      name: "Globex Admin",
      passwordHash: password,
      role: "OPCO_ADMIN",
      opCoId: globex.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "manager@globex.com" },
    update: {},
    create: {
      email: "manager@globex.com",
      name: "Globex Manager",
      passwordHash: password,
      role: "OPCO_MANAGER",
      opCoId: globex.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "carol@globex.com" },
    update: {},
    create: {
      email: "carol@globex.com",
      name: "Carol White",
      passwordHash: password,
      role: "OPCO_USER",
      opCoId: globex.id,
    },
  });

  // ── Categories ────────────────────────────────────────────────────────────

  const acmeCategories = ["Travel", "Meals & Entertainment", "Software & Subscriptions", "Office Supplies", "Training"];
  for (const name of acmeCategories) {
    await prisma.expenseCategory.upsert({
      where: { opCoId_name: { opCoId: acme.id, name } },
      update: {},
      create: { name, opCoId: acme.id, isActive: true },
    });
  }

  const globexCategories = ["Travel", "Client Entertainment", "Equipment", "Marketing", "Consulting Fees"];
  for (const name of globexCategories) {
    await prisma.expenseCategory.upsert({
      where: { opCoId_name: { opCoId: globex.id, name } },
      update: {},
      create: { name, opCoId: globex.id, isActive: true },
    });
  }

  // ── Sample expenses for Alice (Acme) ──────────────────────────────────────

  const alice = await prisma.user.findUniqueOrThrow({ where: { email: "alice@acme.com" } });
  const travelCat = await prisma.expenseCategory.findFirstOrThrow({
    where: { opCoId: acme.id, name: "Travel" },
  });
  const mealsCat = await prisma.expenseCategory.findFirstOrThrow({
    where: { opCoId: acme.id, name: "Meals & Entertainment" },
  });

  const draftExpense = await prisma.expense.upsert({
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

  const submittedExpense = await prisma.expense.upsert({
    where: { id: "seed-expense-submitted-001" },
    update: {},
    create: {
      id: "seed-expense-submitted-001",
      title: "Team Lunch",
      description: "Lunch with product team to discuss roadmap",
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
      description: "2 nights at Marriott for sales conference",
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

  // Approval records for approved/rejected expenses
  const manager = await prisma.user.findUniqueOrThrow({ where: { email: "manager@acme.com" } });

  await prisma.approvalRecord.upsert({
    where: { id: "seed-approval-001" },
    update: {},
    create: {
      id: "seed-approval-001",
      action: "APPROVED",
      comment: "Approved — within policy.",
      expenseId: approvedExpense.id,
      reviewedById: manager.id,
    },
  });

  await prisma.approvalRecord.upsert({
    where: { id: "seed-approval-002" },
    update: {},
    create: {
      id: "seed-approval-002",
      action: "REJECTED",
      comment: "Exceeds the $500 meals limit. Please split and resubmit.",
      expenseId: rejectedExpense.id,
      reviewedById: manager.id,
    },
  });

  console.log("\nSeeded successfully!\n");
  console.log("All accounts use password: Admin@123!\n");
  console.log("┌─────────────────────────────┬──────────────────────────────┬───────────────┐");
  console.log("│ Email                       │ Role                         │ OpCo          │");
  console.log("├─────────────────────────────┼──────────────────────────────┼───────────────┤");
  console.log("│ admin@holdco.com            │ HOLDCO_ADMIN                 │ —             │");
  console.log("│ opco.admin@acme.com         │ OPCO_ADMIN                   │ Acme Corp     │");
  console.log("│ manager@acme.com            │ OPCO_MANAGER                 │ Acme Corp     │");
  console.log("│ alice@acme.com              │ OPCO_USER                    │ Acme Corp     │");
  console.log("│ bob@acme.com                │ OPCO_USER                    │ Acme Corp     │");
  console.log("│ opco.admin@globex.com       │ OPCO_ADMIN                   │ Globex Inc    │");
  console.log("│ manager@globex.com          │ OPCO_MANAGER                 │ Globex Inc    │");
  console.log("│ carol@globex.com            │ OPCO_USER                    │ Globex Inc    │");
  console.log("└─────────────────────────────┴──────────────────────────────┴───────────────┘");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
