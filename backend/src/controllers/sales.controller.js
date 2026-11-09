const prisma = require("../prisma");
const { asyncHandler, httpError, makeInvoiceNo, withSerializationRetry } = require("../utils/helpers");
const { dateRangeWhere, enumValue, integer, money, optionalString, rejectUnknownFields, requireObject, requiredString } = require("../utils/validation");

const MAX_AMOUNT_CENTS = 9999999999;
const MANAGER_APPROVAL_THRESHOLD_CENTS = 5000000;

const saleInclude = {
  items: { include: { product: { select: { name: true, sku: true } } } },
  createdBy: { select: { id: true, name: true } },
  approvedBy: { select: { id: true, name: true } },
  rejectedBy: { select: { id: true, name: true } },
};

function isInvoiceCollision(error) {
  if (error.code !== "P2002") return false;
  const target = error.meta?.target;
  return target === undefined || String(target).toLowerCase().includes("invoiceno");
}

function normalizeSaleItems(items) {
  if (!Array.isArray(items) || items.length === 0) throw httpError(400, "Add at least one item");
  if (items.length > 100) throw httpError(400, "A sale cannot contain more than 100 lines");

  const quantities = new Map();
  for (const [index, rawItem] of items.entries()) {
    const item = requireObject(rawItem, `Item ${index + 1}`);
    rejectUnknownFields(item, ["productId", "quantity"]);
    const productId = integer(item.productId, `Item ${index + 1} product ID`, { min: 1 });
    const quantity = integer(item.quantity, `Item ${index + 1} quantity`, { min: 1 });
    const total = (quantities.get(productId) ?? 0) + quantity;
    if (!Number.isSafeInteger(total)) throw httpError(400, "Combined product quantity is too large");
    quantities.set(productId, total);
  }
  return [...quantities].map(([productId, quantity]) => ({ productId, quantity }));
}

function calculateSaleTotals(subtotalCents, discountPercent, taxRate) {
  if (!Number.isSafeInteger(subtotalCents) || subtotalCents < 0 || subtotalCents > MAX_AMOUNT_CENTS) {
    throw httpError(400, "Sale subtotal exceeds the supported amount");
  }
  const discountBasisPoints = Math.round(discountPercent * 100);
  const taxBasisPoints = Math.round(taxRate * 100);
  const discountCents = Math.round(subtotalCents * discountBasisPoints / 10000);
  const taxableCents = subtotalCents - discountCents;
  const taxCents = Math.round(taxableCents * taxBasisPoints / 10000);
  const totalCents = taxableCents + taxCents;
  if (totalCents > MAX_AMOUNT_CENTS) throw httpError(400, "Sale total exceeds the supported amount");
  return {
    subtotalAmount: subtotalCents / 100,
    discountAmount: discountCents / 100,
    taxAmount: taxCents / 100,
    totalAmount: totalCents / 100,
  };
}

async function recordSaleFulfillment(tx, sale, createdById) {
  if (!sale.items.length) throw httpError(409, "Sale has no items and cannot be approved");

  const totalsByProduct = new Map();
  for (const item of sale.items) {
    totalsByProduct.set(item.productId, (totalsByProduct.get(item.productId) ?? 0) + item.quantity);
  }

  for (const [productId, quantity] of totalsByProduct) {
    const result = await tx.product.updateMany({
      where: { id: productId, quantity: { gte: quantity } },
      data: { quantity: { decrement: quantity } },
    });
    if (result.count !== 1) {
      const product = await tx.product.findUnique({ where: { id: productId } });
      const name = product?.name ?? `Product ${productId}`;
      const available = product?.quantity ?? 0;
      throw httpError(409, `Not enough stock for ${name} (available: ${available})`);
    }
    const product = await tx.product.findUnique({ where: { id: productId }, select: { quantity: true } });
    await tx.inventoryTransaction.create({
      data: {
        productId,
        type: "OUT",
        quantity,
        reason: `Sale ${sale.invoiceNo}`,
        createdById,
        quantityBefore: product.quantity + quantity,
        quantityAfter: product.quantity,
      },
    });
  }

  await tx.financialTransaction.create({
    data: {
      saleId: sale.id,
      amount: Math.round((Number(sale.subtotalAmount) - Number(sale.discountAmount)) * 100) / 100,
      type: "INCOME",
    },
  });
}

async function createSaleWithUniqueInvoice(data, requiresApproval) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const createData = {
        ...data,
        invoiceNo: makeInvoiceNo(),
        ...(requiresApproval
          ? { status: "PENDING" }
          : { status: "APPROVED", approvedAt: new Date(), approvedById: null }),
      };
      if (requiresApproval) {
        return await prisma.sale.create({ data: createData, include: saleInclude });
      }

      return await withSerializationRetry(() =>
        prisma.$transaction(async (tx) => {
          const sale = await tx.sale.create({ data: createData, include: saleInclude });
          await recordSaleFulfillment(tx, { ...sale, items: data.items.create }, data.createdById);
          return sale;
        }, { isolationLevel: "Serializable" })
      );
    } catch (error) {
      if (!isInvoiceCollision(error)) throw error;
    }
  }
  throw httpError(503, "Could not generate a unique invoice number. Please try again.");
}

exports.createSale = asyncHandler(async (req, res) => {
  const body = requireObject(req.body);
  rejectUnknownFields(body, ["items", "paymentMethod", "notes", "discountPercent"]);
  const requestedItems = normalizeSaleItems(body.items);
  const paymentMethod = body.paymentMethod === undefined
    ? null
    : enumValue(body.paymentMethod, "Payment method", ["CASH", "BANK_TRANSFER", "MOBILE"]);
  const notes = optionalString(body.notes, "Notes", { max: 2000 }) || null;
  const discountPercent = body.discountPercent === undefined ? 0 : money(body.discountPercent, "Discount percent");
  if (discountPercent > 100) throw httpError(400, "Discount percent must be between 0 and 100");
  const ids = requestedItems.map((item) => item.productId);
  const [products, settings] = await Promise.all([
    prisma.product.findMany({ where: { id: { in: ids }, isApproved: true } }),
    prisma.businessSettings.findUnique({ where: { id: 1 }, select: { taxRate: true } }),
  ]);
  if (!settings) throw httpError(500, "Business settings have not been initialized");
  const taxRate = Number(settings.taxRate);
  if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) {
    throw httpError(500, "Configured tax rate is invalid");
  }

  const saleItems = [];
  let subtotalCents = 0;
  for (const item of requestedItems) {
    const product = products.find((candidate) => candidate.id === item.productId);
    if (!product) throw httpError(400, `Product ${item.productId} not found or not approved`);
    if (product.quantity < item.quantity) {
      throw httpError(400, `Not enough stock for ${product.name} (available: ${product.quantity})`);
    }

    const unitPriceCents = Math.round(Number(product.sellingPrice) * 100);
    subtotalCents += unitPriceCents * item.quantity;
    if (!Number.isSafeInteger(subtotalCents) || subtotalCents > MAX_AMOUNT_CENTS) {
      throw httpError(400, "Sale subtotal exceeds the supported amount");
    }
    const unitCostCents = Math.round(Number(product.costPrice) * 100);
    if (!Number.isSafeInteger(unitCostCents) || unitCostCents > 9999999999) {
      throw httpError(400, `Cost price for ${product.name} exceeds the supported amount`);
    }
    saleItems.push({
      productId: product.id,
      quantity: item.quantity,
      unitPrice: unitPriceCents / 100,
      unitCost: unitCostCents / 100,
    });
  }

  const totals = calculateSaleTotals(subtotalCents, discountPercent, taxRate);
  const requiresApproval = Math.round(totals.totalAmount * 100) > MANAGER_APPROVAL_THRESHOLD_CENTS;
  const sale = await createSaleWithUniqueInvoice({
    ...totals,
    discountPercent,
    taxRate,
    createdById: req.user.id,
    paymentMethod,
    notes,
    items: { create: saleItems },
  }, requiresApproval);
  res.status(201).json(sale);
});

exports.listSales = asyncHandler(async (req, res) => {
  const where = {};
  if (req.user.role === "SALES_OFFICER") where.createdById = req.user.id;
  if (req.query.status !== undefined) where.status = enumValue(req.query.status, "Status", ["PENDING", "APPROVED", "REJECTED"]);
  const dateField = req.query.dateField === undefined
    ? "createdAt"
    : enumValue(req.query.dateField, "Date field", ["createdAt", "approvedAt", "rejectedAt"]);
  const fallbackStatus = { approvedAt: "APPROVED", rejectedAt: "REJECTED" }[dateField];
  const dateWhere = dateRangeWhere(req.query, dateField, fallbackStatus);
  if (Object.keys(dateWhere).length) where.AND = [dateWhere];
  if (req.query.search !== undefined) {
    const search = requiredString(req.query.search, "Search", { max: 120 });
    where.OR = [
      { invoiceNo: { contains: search, mode: "insensitive" } },
      { createdBy: { name: { contains: search, mode: "insensitive" } } },
    ];
  }

  const sales = await prisma.sale.findMany({
    where,
    include: saleInclude,
    orderBy: { createdAt: "desc" },
  });
  res.json(sales);
});

exports.getSale = asyncHandler(async (req, res) => {
  const id = integer(req.params.id, "Sale ID", { min: 1 });
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: saleInclude,
  });
  if (!sale) throw httpError(404, "Sale not found");
  if (req.user.role === "SALES_OFFICER" && sale.createdById !== req.user.id) {
    throw httpError(403, "Not your sale");
  }
  res.json(sale);
});

exports.approveSale = asyncHandler(async (req, res) => {
  const saleId = integer(req.params.id, "Sale ID", { min: 1 });

  await withSerializationRetry(() =>
    prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({ where: { id: saleId }, include: { items: true } });
      if (!sale) throw httpError(404, "Sale not found");
      if (sale.status !== "PENDING") throw httpError(409, "Sale already processed");
      await recordSaleFulfillment(tx, sale, req.user.id);

      const transition = await tx.sale.updateMany({
        where: { id: saleId, status: "PENDING" },
        data: { status: "APPROVED", approvedById: req.user.id, approvedAt: new Date() },
      });
      if (transition.count !== 1) throw httpError(409, "Sale already processed");
    }, { isolationLevel: "Serializable" })
  );

  res.json({ message: "Sale approved" });
});

exports.rejectSale = asyncHandler(async (req, res) => {
  const saleId = integer(req.params.id, "Sale ID", { min: 1 });
  const body = requireObject(req.body);
  rejectUnknownFields(body, ["reason"]);
  const rejectionReason = requiredString(body.reason, "Rejection reason", { max: 1000 });
  const transition = await prisma.sale.updateMany({
    where: { id: saleId, status: "PENDING" },
    data: {
      status: "REJECTED",
      rejectedById: req.user.id,
      rejectedAt: new Date(),
      rejectionReason,
    },
  });
  if (transition.count === 0) {
    const sale = await prisma.sale.findUnique({ where: { id: saleId }, select: { id: true } });
    if (!sale) throw httpError(404, "Sale not found");
    throw httpError(409, "Sale already processed");
  }
  res.json({ message: "Sale rejected" });
});

exports._normalizeSaleItems = normalizeSaleItems;
exports._calculateSaleTotals = calculateSaleTotals;
