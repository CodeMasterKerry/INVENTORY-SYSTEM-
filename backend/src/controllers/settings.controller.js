const prisma = require("../prisma");
const { asyncHandler, httpError } = require("../utils/helpers");
const { integer, money, rejectUnknownFields, requireObject, requiredString } = require("../utils/validation");

exports.getBusinessSettings = asyncHandler(async (req, res) => {
  const settings = await prisma.businessSettings.findUnique({ where: { id: 1 } });
  if (!settings) throw httpError(500, "Business settings have not been initialized");
  res.json(settings);
});

exports.updateBusinessSettings = asyncHandler(async (req, res) => {
  const body = requireObject(req.body);
  rejectUnknownFields(body, ["businessName", "taxRate", "defaultLowStockLevel"]);
  if (!Object.keys(body).length) throw httpError(400, "At least one setting is required");

  const data = {};
  if (body.businessName !== undefined) data.businessName = requiredString(body.businessName, "Business name", { max: 160 });
  if (body.taxRate !== undefined) {
    data.taxRate = money(body.taxRate, "Tax rate");
    if (data.taxRate > 100) throw httpError(400, "Tax rate must be between 0 and 100");
  }
  if (body.defaultLowStockLevel !== undefined) {
    data.defaultLowStockLevel = integer(body.defaultLowStockLevel, "Default low-stock level", { max: 2147483647 });
  }

  const settings = await prisma.businessSettings.update({
    where: { id: 1 },
    data: { ...data, updatedById: req.user.id },
  });
  res.json(settings);
});
