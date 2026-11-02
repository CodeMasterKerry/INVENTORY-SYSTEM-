const prisma = require("../prisma");
const { asyncHandler, httpError, makeInvoiceNo } = require("../utils/helpers");

const saleInclude = {
  items: { include: { product: { select: { name: true, sku: true } } } },
  createdBy: { select: { id: true, name: true } },
  approvedBy: { select: { id: true, name: true } },
};

// 1. Create a sale (status PENDING). Stock is checked but NOT deducted yet.
exports.createSale = asyncHandler(async (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) throw httpError(400, "Add at least one item");

  const ids = items.map((i) => Number(i.productId));
  const products = await prisma.product.findMany({ where: { id: { in: ids }, isApproved: true } });

  let total = 0;
  const saleItems = [];
  for (const i of items) {
    const qty = Number(i.quantity);
    const p = products.find((x) => x.id === Number(i.productId));
    if (!p) throw httpError(400, `Product ${i.productId} not found or not approved`);
    if (!Number.isInteger(qty) || qty <= 0) throw httpError(400, "Quantity must be a positive whole number");
    if (p.quantity < qty) throw httpError(400, `Not enough stock for ${p.name} (available: ${p.quantity})`);

    const price = Number(p.sellingPrice);
    total += price * qty;
    saleItems.push({ productId: p.id, quantity: qty, unitPrice: price });
  }

  const sale = await prisma.sale.create({
    data: {
      invoiceNo: makeInvoiceNo(),
      totalAmount: Math.round(total * 100) / 100,
      createdById: req.user.id,
      items: { create: saleItems },
    },
    include: saleInclude,
  });
  res.status(201).json(sale);
});

// 2. List sales. Officers see only their own.
exports.listSales = asyncHandler(async (req, res) => {
  const where = {};
  if (req.user.role === "SALES_OFFICER") where.createdById = req.user.id;
  if (req.query.status) where.status = req.query.status;

  const sales = await prisma.sale.findMany({
    where,
    include: saleInclude,
    orderBy: { createdAt: "desc" },
  });
  res.json(sales);
});

exports.getSale = asyncHandler(async (req, res) => {
  const sale = await prisma.sale.findUnique({
    where: { id: Number(req.params.id) },
    include: saleInclude,
  });
  if (!sale) throw httpError(404, "Sale not found");
  if (req.user.role === "SALES_OFFICER" && sale.createdById !== req.user.id) {
    throw httpError(403, "Not your sale");
  }
  res.json(sale);
});

// 3. Manager approves: deduct stock + log movement + record income. All or nothing.
exports.approveSale = asyncHandler(async (req, res) => {
  const saleId = Number(req.params.id);

  await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findUnique({ where: { id: saleId }, include: { items: true } });
    if (!sale) throw httpError(404, "Sale not found");
    if (sale.status !== "PENDING") throw httpError(400, "Sale already processed");

    for (const item of sale.items) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (product.quantity < item.quantity) {
        throw httpError(400, `Not enough stock for ${product.name} (available: ${product.quantity})`);
      }
      await tx.product.update({
        where: { id: item.productId },
        data: { quantity: { decrement: item.quantity } },
      });
      await tx.inventoryTransaction.create({
        data: {
          productId: item.productId,
          type: "OUT",
          quantity: item.quantity,
          reason: `Sale ${sale.invoiceNo}`,
        },
      });
    }

    await tx.financialTransaction.create({
      data: { saleId, amount: sale.totalAmount, type: "INCOME" },
    });

    await tx.sale.update({
      where: { id: saleId },
      data: { status: "APPROVED", approvedById: req.user.id, approvedAt: new Date() },
    });
  });

  res.json({ message: "Sale approved" });
});

// 4. Manager rejects
exports.rejectSale = asyncHandler(async (req, res) => {
  const saleId = Number(req.params.id);
  const sale = await prisma.sale.findUnique({ where: { id: saleId } });
  if (!sale) throw httpError(404, "Sale not found");
  if (sale.status !== "PENDING") throw httpError(400, "Sale already processed");

  await prisma.sale.update({
    where: { id: saleId },
    data: { status: "REJECTED", approvedById: req.user.id, approvedAt: new Date() },
  });
  res.json({ message: "Sale rejected" });
});