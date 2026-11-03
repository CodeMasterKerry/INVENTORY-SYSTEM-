const bcrypt = require("bcryptjs");
const prisma = require("../prisma");
const { asyncHandler, httpError } = require("../utils/helpers");

const safeFields = { id: true, name: true, email: true, role: true, isActive: true, createdAt: true };

exports.listUsers = asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({ select: safeFields, orderBy: { id: "asc" } });
  res.json(users);
});

// Manager creates Sales Officer accounts
exports.createUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) throw httpError(400, "Name, email and password are required");
  if (password.length < 6) throw httpError(400, "Password must be at least 6 characters");

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) throw httpError(400, "Email already in use");

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, password: hashed, role: "SALES_OFFICER" },
    select: safeFields,
  });
  res.status(201).json(user);
});

// Activate / deactivate / rename
exports.updateUser = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { name, isActive } = req.body;
  if (id === req.user.id && isActive === false) {
    throw httpError(400, "You cannot deactivate your own account");
  }
  const data = {};
  if (name !== undefined) data.name = name;
  if (isActive !== undefined) {
  if (typeof isActive !== "boolean") {
    throw httpError(400, "isActive must be true or false");
  }
  data.isActive = isActive;
}
  const user = await prisma.user.update({ where: { id }, data, select: safeFields });
  res.json(user);
});