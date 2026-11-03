const prisma = require("../prisma");
const { asyncHandler, httpError } = require("../utils/helpers");

exports.listCategories = asyncHandler(async (req, res) => {
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
  res.json(categories);
});

exports.createCategory = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name) throw httpError(400, "Category name is required");
  const exists = await prisma.category.findUnique({ where: { name } });
  if (exists) throw httpError(400, "Category already exists");
  const category = await prisma.category.create({ data: { name } });
  res.status(201).json(category);
});