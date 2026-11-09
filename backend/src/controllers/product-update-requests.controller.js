const prisma = require("../prisma");
const { asyncHandler, httpError } = require("../utils/helpers");
const { dateRangeWhere, integer, money, optionalString, rejectUnknownFields, requiredString, requireObject } = require("../utils/validation");

const requestInclude = {
  product: { include: { category: true } },
  proposedCategory: true,
  requestedBy: { select: { id: true, name: true } },
  reviewedBy: { select: { id: true, name: true } },
};

function normalizeProposal(body) {
  rejectUnknownFields(body, ["name", "costPrice", "sellingPrice", "lowStockLevel", "categoryId", "description", "unit"]);
  const data = {
    proposedName: requiredString(body.name, "Name", { max: 160 }),
    proposedCostPrice: money(body.costPrice, "Cost price"),
    proposedSellingPrice: money(body.sellingPrice, "Selling price"),
    proposedLowStockLevel: integer(body.lowStockLevel, "Low-stock level"),
    proposedCategoryId: integer(body.categoryId, "Category ID", { min: 1 }),
    proposedDescription: optionalString(body.description, "Description", { max: 5000 }) || null,
    proposedUnit: optionalString(body.unit, "Unit", { max: 40 }) || null,
  };
  return data;
}

exports.listPending = asyncHandler(async (req, res) => {
  const requests = await prisma.productUpdateRequest.findMany({
    where: { status: "PENDING", ...dateRangeWhere(req.query, "createdAt") },
    include: requestInclude,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  res.json(requests);
});

exports.listMine = asyncHandler(async (req, res) => {
  const requests = await prisma.productUpdateRequest.findMany({
    where: { requestedById: req.user.id, status: "PENDING" },
    select: { id: true, productId: true, status: true, createdAt: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  res.json(requests);
});

exports.create = asyncHandler(async (req, res) => {
  const productId = integer(req.params.id, "Product ID", { min: 1 });
  const data = normalizeProposal(requireObject(req.body));
  const [product, category, existing] = await Promise.all([
    prisma.product.findUnique({ where: { id: productId } }),
    prisma.category.findUnique({ where: { id: data.proposedCategoryId } }),
    prisma.productUpdateRequest.findFirst({ where: { productId, status: "PENDING" }, select: { id: true } }),
  ]);
  if (!product || !product.isApproved) throw httpError(404, "Approved product not found");
  if (!category) throw httpError(400, "Category not found");
  if (existing) throw httpError(409, "This product already has a pending update request");

  try {
    const request = await prisma.productUpdateRequest.create({
      data: { productId, requestedById: req.user.id, ...data },
      include: requestInclude,
    });
    res.status(201).json(request);
  } catch (error) {
    if (error.code === "P2002") throw httpError(409, "This product already has a pending update request");
    throw error;
  }
});

exports.approve = asyncHandler(async (req, res) => {
  const id = integer(req.params.id, "Request ID", { min: 1 });
  const request = await prisma.$transaction(async (tx) => {
    const pending = await tx.productUpdateRequest.findFirst({
      where: { id, status: "PENDING" },
      include: requestInclude,
    });
    if (!pending) {
      const exists = await tx.productUpdateRequest.findUnique({ where: { id }, select: { id: true } });
      if (!exists) throw httpError(404, "Product update request not found");
      throw httpError(409, "Product update request already processed");
    }

    await tx.product.update({
      where: { id: pending.productId },
      data: {
        name: pending.proposedName,
        costPrice: pending.proposedCostPrice,
        sellingPrice: pending.proposedSellingPrice,
        lowStockLevel: pending.proposedLowStockLevel,
        categoryId: pending.proposedCategoryId,
        description: pending.proposedDescription,
        unit: pending.proposedUnit,
      },
    });
    const updated = await tx.productUpdateRequest.updateMany({
      where: { id, status: "PENDING" },
      data: { status: "APPROVED", reviewedAt: new Date(), reviewedById: req.user.id },
    });
    if (updated.count !== 1) throw httpError(409, "Product update request already processed");
    return tx.productUpdateRequest.findUnique({ where: { id }, include: requestInclude });
  });
  res.json(request);
});

exports.reject = asyncHandler(async (req, res) => {
  const id = integer(req.params.id, "Request ID", { min: 1 });
  const body = requireObject(req.body);
  rejectUnknownFields(body, ["reason"]);
  const rejectionReason = requiredString(body.reason, "Rejection reason", { max: 1000 });
  const result = await prisma.productUpdateRequest.updateMany({
    where: { id, status: "PENDING" },
    data: { status: "REJECTED", reviewedAt: new Date(), reviewedById: req.user.id, rejectionReason },
  });
  if (result.count !== 1) {
    const exists = await prisma.productUpdateRequest.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw httpError(404, "Product update request not found");
    throw httpError(409, "Product update request already processed");
  }
  res.json(await prisma.productUpdateRequest.findUnique({ where: { id }, include: requestInclude }));
});
