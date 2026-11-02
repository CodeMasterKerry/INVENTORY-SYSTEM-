require("dotenv").config();
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const managerPass = await bcrypt.hash("manager123", 10);
  const officerPass = await bcrypt.hash("officer123", 10);

  await prisma.user.upsert({
    where: { email: "manager@esims.com" },
    update: {},
    create: { name: "Main Manager", email: "manager@esims.com", password: managerPass, role: "MANAGER" },
  });
  await prisma.user.upsert({
    where: { email: "officer@esims.com" },
    update: {},
    create: { name: "Sales Officer One", email: "officer@esims.com", password: officerPass, role: "SALES_OFFICER" },
  });

  const electronics = await prisma.category.upsert({
    where: { name: "Electronics" }, update: {}, create: { name: "Electronics" },
  });
  const stationery = await prisma.category.upsert({
    where: { name: "Stationery" }, update: {}, create: { name: "Stationery" },
  });

  const products = [
    { name: "USB Cable", sku: "USB-001", costPrice: 3, sellingPrice: 6, quantity: 50, categoryId: electronics.id },
    { name: "Phone Charger", sku: "CHG-001", costPrice: 8, sellingPrice: 15, quantity: 30, categoryId: electronics.id },
    { name: "Notebook A4", sku: "NTB-001", costPrice: 1, sellingPrice: 2.5, quantity: 100, categoryId: stationery.id },
    { name: "Ball Pen", sku: "PEN-001", costPrice: 0.2, sellingPrice: 0.6, quantity: 200, categoryId: stationery.id },
  ];

  for (const p of products) {
    const existing = await prisma.product.findUnique({ where: { sku: p.sku } });
    if (!existing) {
      const created = await prisma.product.create({ data: { ...p, isApproved: true } });
      await prisma.inventoryTransaction.create({
        data: { productId: created.id, type: "IN", quantity: p.quantity, reason: "Initial stock" },
      });
    }
  }
  console.log("Seed finished ✅");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());