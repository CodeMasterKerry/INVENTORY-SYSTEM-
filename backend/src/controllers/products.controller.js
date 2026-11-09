const prisma = require("../prisma");
const { asyncHandler, httpError, withSerializationRetry } = require("../utils/helpers");
const { dateRange, integer, money, optionalString, rejectUnknownFields, requireObject, requiredString } = require("../utils/validation");

// Managers see everything. Officers see approved products + their own pending ones.
exports.listProducts = asyncHandler(async (req, res) => {
  const where =
    req.user.role === "MANAGER"
      ? {}
      : { OR: [{ isApproved: true }, { createdById: req.user.id }] };

  const search = req.query.search === undefined ? undefined : requiredString(req.query.search, "Search", { max: 120 });
  if (search) {
    where.AND = [
      { OR: [
        { name: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
      ] },
    ];
  }
  const createdAt = dateRange(req.query);
  if (Object.keys(createdAt).length) where.createdAt = createdAt;

  const products = await prisma.product.findMany({
    where,
    include: { category: true },
    orderBy: { id: "desc" },
  });
  res.json(products);
});

// Manager: auto-approved. Officer: waits for approval.
exports.createProduct = asyncHandler(async (req, res) => {
  const body = requireObject(req.body);
  rejectUnknownFields(body, ["name", "sku", "costPrice", "sellingPrice", "quantity", "lowStockLevel", "categoryId", "description", "unit"]);
  const name = requiredString(body.name, "Name", { max: 160 });
  const sku = requiredString(body.sku, "SKU", { max: 64 });
  const costPrice = money(body.costPrice, "Cost price");
  const sellingPrice = money(body.sellingPrice, "Selling price");
  const quantity = body.quantity === undefined ? 0 : integer(body.quantity, "Quantity");
  let lowStockLevel;
  if (body.lowStockLevel === undefined) {
    const settings = await prisma.businessSettings.findUnique({
      where: { id: 1 },
      select: { defaultLowStockLevel: true },
    });
    if (!settings) throw httpError(500, "Business settings have not been initialized");
    lowStockLevel = settings.defaultLowStockLevel;
  } else {
    lowStockLevel = integer(body.lowStockLevel, "Low-stock level");
  }
  const categoryId = integer(body.categoryId, "Category ID", { min: 1 });
  const description = optionalString(body.description, "Description", { max: 5000 }) || null;
  const unit = optionalString(body.unit, "Unit", { max: 40 }) || null;

  const [exists, category] = await Promise.all([
    prisma.product.findUnique({ where: { sku } }),
    prisma.category.findUnique({ where: { id: categoryId } }),
  ]);
  if (exists) throw httpError(409, "SKU already exists");
  if (!category) throw httpError(400, "Category not found");

  const isManager = req.user.role === "MANAGER";
  const qty = quantity;

  const product = await prisma.$transaction(async (tx) => {
    const p = await tx.product.create({
      data: {
        name,
        sku,
        costPrice,
        sellingPrice,
        quantity: qty,
        lowStockLevel,
        description,
        unit,
        categoryId,
        isApproved: isManager,
        createdById: req.user.id,
      },
    });
    if (qty > 0) {
      await tx.inventoryTransaction.create({
        data: {
          productId: p.id,
          type: "IN",
          quantity: qty,
          reason: "Initial stock",
          createdById: req.user.id,
          quantityBefore: 0,
          quantityAfter: qty,
        },
      });
    }
    return p;
  });

  res.status(201).json(product);
});

// Manager edits product details (not stock - use restock for that)
exports.updateProduct = asyncHandler(async (req, res) => {
  const id = integer(req.params.id, "Product ID", { min: 1 });
  const body = requireObject(req.body);
  rejectUnknownFields(body, ["name", "costPrice", "sellingPrice", "lowStockLevel", "categoryId", "description", "unit"]);
  if (Object.keys(body).length === 0) throw httpError(400, "At least one field is required");
  const { name, costPrice, sellingPrice, lowStockLevel, categoryId, description, unit } = body;
  const data = {};
  if (name !== undefined) data.name = requiredString(name, "Name", { max: 160 });
  if (costPrice !== undefined) data.costPrice = money(costPrice, "Cost price");
  if (sellingPrice !== undefined) data.sellingPrice = money(sellingPrice, "Selling price");
  if (lowStockLevel !== undefined) data.lowStockLevel = integer(lowStockLevel, "Low-stock level");
  if (description !== undefined) data.description = optionalString(description, "Description", { max: 5000 }) || null;
  if (unit !== undefined) data.unit = optionalString(unit, "Unit", { max: 40 }) || null;
  if (categoryId !== undefined) {
    data.categoryId = integer(categoryId, "Category ID", { min: 1 });
    const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
    if (!category) throw httpError(400, "Category not found");
  }

  const product = await prisma.product.update({ where: { id }, data });
  res.json(product);
});

exports.approveProduct = asyncHandler(async (req, res) => {
  const id = integer(req.params.id, "Product ID", { min: 1 });
  const result = await prisma.product.updateMany({
    where: { id, isApproved: false, rejectedAt: null },
    data: { isApproved: true },
  });
  if (result.count !== 1) {
    const product = await prisma.product.findUnique({ where: { id }, select: { id: true } });
    if (!product) throw httpError(404, "Product not found");
    throw httpError(409, "Product request already processed");
  }
  res.json(await prisma.product.findUnique({ where: { id }, include: { category: true } }));
});

exports.rejectProduct = asyncHandler(async (req, res) => {
  const id = integer(req.params.id, "Product ID", { min: 1 });
  const body = requireObject(req.body);
  rejectUnknownFields(body, ["reason"]);
  const rejectionReason = requiredString(body.reason, "Rejection reason", { max: 1000 });
  const result = await prisma.product.updateMany({
    where: { id, isApproved: false, rejectedAt: null },
    data: { rejectedAt: new Date(), rejectionReason, rejectedById: req.user.id },
  });
  if (result.count !== 1) {
    const product = await prisma.product.findUnique({ where: { id }, select: { id: true } });
    if (!product) throw httpError(404, "Product not found");
    throw httpError(409, "Product request already processed");
  }
  res.json(await prisma.product.findUnique({ where: { id }, include: { category: true } }));
});

// Add stock to a product and log it
exports.restockProduct = asyncHandler(async (req, res) => {
  const id = integer(req.params.id, "Product ID", { min: 1 });
  const body = requireObject(req.body);
  rejectUnknownFields(body, ["quantity", "reason"]);
  const qty = integer(body.quantity, "Quantity", { min: 1 });
  const reason = optionalString(body.reason, "Reason", { max: 500 }) || "Restock";

  const product = await withSerializationRetry(() => prisma.$transaction(async (tx) => {
    const before = await tx.product.findUnique({ where: { id }, select: { quantity: true } });
    if (!before) throw httpError(404, "Product not found");
    if (before.quantity + qty > 2147483647) throw httpError(400, "Stock quantity exceeds the supported limit");
    const update = await tx.product.updateMany({ where: { id }, data: { quantity: { increment: qty } } });
    if (update.count !== 1) throw httpError(404, "Product not found");
    const p = await tx.product.findUnique({ where: { id } });
    await tx.inventoryTransaction.create({
      data: {
        productId: id,
        type: "IN",
        quantity: qty,
        reason,
        createdById: req.user.id,
        quantityBefore: before.quantity,
        quantityAfter: p.quantity,
      },
    });
    return p;
  }, { isolationLevel: "Serializable" }));
  res.json(product);
});

exports.lowStock = asyncHandler(async (req, res) => {
  const all = await prisma.product.findMany({ where: { isApproved: true }, include: { category: true } });
  res.json(all.filter((p) => p.quantity <= p.lowStockLevel));
});

exports.stockHistory = asyncHandler(async (req, res) => {
  const where = {};
  const createdAt = dateRange(req.query);
  if (Object.keys(createdAt).length) where.createdAt = createdAt;

  const history = await prisma.inventoryTransaction.findMany({
    where,
    include: {
      product: { select: { name: true, sku: true } },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  res.json(history);
});