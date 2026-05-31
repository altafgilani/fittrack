import { prisma } from "./lib/prisma";

async function main() {
  console.log("Seed complete (no seed data required — app is user-driven).");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
