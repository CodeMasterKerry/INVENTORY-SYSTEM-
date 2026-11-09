const prisma = require("../prisma");
const { asyncHandler, httpError } = require("../utils/helpers");
const { requiredString, requireObject } = require("../utils/validation");

exports.listCategories = asyncHandler(async (req, res) => {
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
  res.json(categories);
});

exports.createCategory = asyncHandler(async (req, res) => {
  const body = requireObject(req.body);
  const name = requiredString(body.name, "Category name", { max: 120 });
  const exists = await prisma.category.findFirst({ where: { name: { equals: name, mode: "insensitive" } } });
  if (exists) throw httpError(409, "Category already exists");
  const category = await prisma.category.create({ data: { name } });
  res.status(201).json(category);
});