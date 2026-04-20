import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Admin@123!", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@holdco.com" },
    update: {},
    create: {
      email: "admin@holdco.com",
      name: "HoldCo Administrator",
      passwordHash,
      role: "HOLDCO_ADMIN",
      opCoId: null,
    },
  });

  console.log(`Seeded HoldCo admin: ${admin.email}`);
  console.log("Default password: Admin@123! (change immediately)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
