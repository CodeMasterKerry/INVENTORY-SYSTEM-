const prisma = require("../prisma");
const { asyncHandler, httpError } = require("../utils/helpers");

// Managers see everything. Officers see approved products + their own pending ones.
exports.listProducts = asyncHandler(async (req, res) => {
  const where =
    req.user.role === "MANAGER"
      ? {}
      : { OR: [{ isApproved: true }, { createdById: req.user.id }] };

  const search = req.query.search;
  if (search) {
    where.AND = [
      { OR: [
        { name: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
      ] },
    ];
  }

  const products = await prisma.product.findMany({
    where,
    include: { category: true },
    orderBy: { id: "desc" },
  });
  res.json(products);
});

// Manager: auto-approved. Officer: waits for approval.
exports.createProduct = asyncHandler(async (req, res) => {
  const { name, sku, costPrice, sellingPrice, quantity, lowStockLevel, categoryId } = req.body;
  if (!name || !sku || costPrice === undefined || sellingPrice === undefined || !categoryId) {
    throw httpError(400, "name, sku, costPrice, sellingPrice and categoryId are required");
  }
  if (Number(costPrice) < 0 || Number(sellingPrice) < 0) throw httpError(400, "Prices cannot be negative");

  const exists = await prisma.product.findUnique({ where: { sku } });
  if (exists) throw httpError(400, "SKU already exists");

  const isManager = req.user.role === "MANAGER";
  const qty = Number(quantity) || 0;

  const product = await prisma.$transaction(async (tx) => {
    const p = await tx.product.create({
      data: {
        name,
        sku,
        costPrice: Number(costPrice),
        sellingPrice: Number(sellingPrice),
        quantity: qty,
        lowStockLevel: Number(lowStockLevel) || 5,
        categoryId: Number(categoryId),
        isApproved: isManager,
        createdById: req.user.id,
      },
    });
    if (qty > 0) {
      await tx.inventoryTransaction.create({
        data: { productId: p.id, type: "IN", quantity: qty, reason: "Initial stock" },
      });
    }
    return p;
  });

  res.status(201).json(product);
});

// Manager edits product details (not stock - use restock for that)
exports.updateProduct = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { name, costPrice, sellingPrice, lowStockLevel, categoryId } = req.body;
  const data = {};
  if (name !== undefined) data.name = name;
  if (costPrice !== undefined) data.costPrice = Number(costPrice);
  if (sellingPrice !== undefined) data.sellingPrice = Number(sellingPrice);
  if (lowStockLevel !== undefined) data.lowStockLevel = Number(lowStockLevel);
  if (categoryId !== undefined) data.categoryId = Number(categoryId);

  const product = await prisma.product.update({ where: { id }, data });
  res.json(product);
});

exports.approveProduct = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const product = await prisma.product.update({ where: { id }, data: { isApproved: true } });
  res.json(product);
});

// Add stock to a product and log it
exports.restockProduct = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const qty = Number(req.body.quantity);
  if (!Number.isInteger(qty) || qty <= 0) throw httpError(400, "Quantity must be a positive whole number");

  const product = await prisma.$transaction(async (tx) => {
    const p = await tx.product.update({ where: { id }, data: { quantity: { increment: qty } } });
    await tx.inventoryTransaction.create({
      data: { productId: id, type: "IN", quantity: qty, reason: req.body.reason || "Restock" },
    });
    return p;
  });
  res.json(product);
});

exports.lowStock = asyncHandler(async (req, res) => {
  const all = await prisma.product.findMany({ where: { isApproved: true }, include: { category: true } });
  res.json(all.filter((p) => p.quantity <= p.lowStockLevel));
});

exports.stockHistory = asyncHandler(async (req, res) => {
  const history = await prisma.inventoryTransaction.findMany({
    include: { product: { select: { name: true, sku: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  res.json(history);
});