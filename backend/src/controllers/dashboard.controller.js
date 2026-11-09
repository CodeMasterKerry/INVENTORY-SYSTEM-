const prisma = require("../prisma");
const { asyncHandler } = require("../utils/helpers");
const { dateRangeWhere } = require("../utils/validation");

exports.managerDashboard = asyncHandler(async (req, res) => {
  const approvedWhere = {
    status: "APPROVED",
    ...dateRangeWhere(req.query, "approvedAt", "APPROVED"),
  };
  const createdWhere = dateRangeWhere(req.query, "createdAt");
  const revenueAgg = await prisma.sale.aggregate({
    where: approvedWhere,
    _sum: { subtotalAmount: true, discountAmount: true },
  });
  const revenue = Number(revenueAgg._sum.subtotalAmount || 0) - Number(revenueAgg._sum.discountAmount || 0);

  // Use stored cost snapshots; legacy rows without a snapshot cannot be accurately priced.
  const sales = await prisma.sale.findMany({
    where: approvedWhere,
    select: {
      discountAmount: true,
      items: { select: { unitPrice: true, unitCost: true, quantity: true } },
    },
  });
  const profit = sales.reduce((sum, sale) => {
    const grossProfit = sale.items.reduce(
      (saleSum, item) => saleSum + (item.unitCost === null ? 0 : (Number(item.unitPrice) - Number(item.unitCost)) * item.quantity),
      0
    );
    return sum + grossProfit - Number(sale.discountAmount);
  }, 0);
  const unknownCostLines = sales.reduce(
    (count, sale) => count + sale.items.filter((item) => item.unitCost === null).length,
    0
  );

  const [pendingSales, pendingProducts, totalProducts, totalOfficers, approvedSales] =
    await Promise.all([
      prisma.sale.count({ where: { status: "PENDING", ...createdWhere } }),
      prisma.product.count({ where: { isApproved: false, ...createdWhere } }),
      prisma.product.count({ where: { isApproved: true } }),
      prisma.user.count({ where: { role: "SALES_OFFICER" } }),
      prisma.sale.count({ where: approvedWhere }),
    ]);

  const products = await prisma.product.findMany({ where: { isApproved: true } });
  const lowStockCount = products.filter((p) => p.quantity <= p.lowStockLevel).length;

  res.json({
    revenue,
    profit: Math.round(profit * 100) / 100,
    unknownCostLines,
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
  const approvedWhere = {
    createdById: me,
    status: "APPROVED",
    ...dateRangeWhere(req.query, "approvedAt", "APPROVED"),
  };
  const pendingWhere = {
    createdById: me,
    status: "PENDING",
    ...dateRangeWhere(req.query, "createdAt"),
  };
  const rejectedWhere = {
    createdById: me,
    status: "REJECTED",
    ...dateRangeWhere(req.query, "rejectedAt", "REJECTED"),
  };
  const approvedAgg = await prisma.sale.aggregate({
    where: approvedWhere,
    _sum: { subtotalAmount: true, discountAmount: true },
    _count: true,
  });
  const [pending, rejected] = await Promise.all([
    prisma.sale.count({ where: pendingWhere }),
    prisma.sale.count({ where: rejectedWhere }),
  ]);

  res.json({
    approvedSales: approvedAgg._count,
    totalSold: Number(approvedAgg._sum.subtotalAmount || 0) - Number(approvedAgg._sum.discountAmount || 0),
    pendingSales: pending,
    rejectedSales: rejected,
  });
});