const bcrypt = require("bcryptjs");
const prisma = require("../prisma");
const { asyncHandler, httpError } = require("../utils/helpers");
const { emailAddress, integer, rejectUnknownFields, requireObject, requiredString } = require("../utils/validation");

const safeFields = { id: true, name: true, email: true, role: true, isActive: true, createdAt: true };

exports.listUsers = asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({ select: safeFields, orderBy: { id: "asc" } });
  res.json(users);
});

// Manager creates Sales Officer accounts
exports.createUser = asyncHandler(async (req, res) => {
  const body = requireObject(req.body);
  rejectUnknownFields(body, ["name", "email", "password"]);
  const name = requiredString(body.name, "Name", { max: 120 });
  const email = emailAddress(body.email);
  const password = body.password;
  if (typeof password !== "string" || password.length < 6 || password.length > 1024) {
    throw httpError(400, "Password must be between 6 and 1024 characters");
  }

  const exists = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
  if (exists) throw httpError(409, "Email already in use");

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, password: hashed, role: "SALES_OFFICER" },
    select: safeFields,
  });
  res.status(201).json(user);
});

// Activate / deactivate / rename
exports.updateUser = asyncHandler(async (req, res) => {
  const id = integer(req.params.id, "User ID", { min: 1 });
  const body = requireObject(req.body);
  rejectUnknownFields(body, ["name", "isActive"]);
  const { name, isActive } = body;
  if (Object.keys(body).length === 0) throw httpError(400, "At least one field is required");
  if (id === req.user.id && isActive === false) {
    throw httpError(400, "You cannot deactivate your own account");
  }
  const data = {};
  if (name !== undefined) data.name = requiredString(name, "Name", { max: 120 });
  if (isActive !== undefined) {
    if (typeof isActive !== "boolean") throw httpError(400, "isActive must be true or false");
    data.isActive = isActive;
  }
  const user = await prisma.user.update({ where: { id }, data, select: safeFields });
  res.json(user);
});