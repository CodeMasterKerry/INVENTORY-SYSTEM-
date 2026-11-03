const prisma = require("../prisma");
const { asyncHandler } = require("../utils/helpers");

exports.managerDashboard = asyncHandler(async (req, res) => {
  const revenueAgg = await prisma.financialTransaction.aggregate({ _sum: { amount: true } });
  const revenue = Number(revenueAgg._sum.amount || 0);

  // Profit = sum of (selling price - cost price) x quantity for approved sales
  const items = await prisma.saleItem.findMany({
    where: { sale: { status: "APPROVED" } },
    include: { product: { select: { costPrice: true } } },
  });
  const profit = items.reduce(
    (sum, i) => sum + (Number(i.unitPrice) - Number(i.product.costPrice)) * i.quantity,
    0
  );

  const [pendingSales, pendingProducts, totalProducts, totalOfficers, approvedSales] =
    await Promise.all([
      prisma.sale.count({ where: { status: "PENDING" } }),
      prisma.product.count({ where: { isApproved: false } }),
      prisma.product.count({ where: { isApproved: true } }),
      prisma.user.count({ where: { role: "SALES_OFFICER" } }),
      prisma.sale.count({ where: { status: "APPROVED" } }),
    ]);

  const products = await prisma.product.findMany({ where: { isApproved: true } });
  const lowStockCount = products.filter((p) => p.quantity <= p.lowStockLevel).length;

  res.json({
    revenue,
    profit: Math.round(profit * 100) / 100,
    pendingSales,
    pendingProducts,
    totalProducts,
    totalOfficers,
    approvedSales,
    lowStockCount,
  });
});

exports.officerDashboard = asyncHandler(async (req, res) => {
  const me = req.user.id;
  const approvedAgg = await prisma.sale.aggregate({
    where: { createdById: me, status: "APPROVED" },
    _sum: { totalAmount: true },
    _count: true,
  });
  const [pending, rejected] = await Promise.all([
    prisma.sale.count({ where: { createdById: me, status: "PENDING" } }),
    prisma.sale.count({ where: { createdById: me, status: "REJECTED" } }),
  ]);

  res.json({
    approvedSales: approvedAgg._count,
    totalSold: Number(approvedAgg._sum.totalAmount || 0),
    pendingSales: pending,
    rejectedSales: rejected,
  });
});