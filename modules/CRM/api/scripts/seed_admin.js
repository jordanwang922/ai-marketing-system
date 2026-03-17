const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const brandName = process.env.SEED_BRAND || "Just Right";
  const email = process.env.SEED_EMAIL || "admin@justright.ai";
  const password = process.env.SEED_PASSWORD || "ChangeMe123";
  const name = process.env.SEED_NAME || "Admin";

  const brand = await prisma.brand.create({ data: { name: brandName } });
  const team = await prisma.team.create({ data: { name: "Main Team", brandId: brand.id } });
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      brandId: brand.id,
      teamId: team.id,
      email,
      name,
      role: "manager",
      passwordHash,
    },
  });

  console.log("Seed completed");
  console.log("BRAND_ID", brand.id);
  console.log("TEAM_ID", team.id);
  console.log("USER_ID", user.id);
  console.log("EMAIL", email);
  console.log("PASSWORD", password);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
