const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../prisma");
const { asyncHandler, httpError } = require("../utils/helpers");
const { emailAddress, requireObject } = require("../utils/validation");

exports.login = asyncHandler(async (req, res) => {
  const body = requireObject(req.body);
  const email = emailAddress(body.email);
  if (typeof body.password !== "string" || !body.password || body.password.length > 1024) {
    throw httpError(400, "Password is required and must be 1024 characters or fewer");
  }
  const password = body.password;

  const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
  if (!user || !user.isActive) throw httpError(401, "Invalid email or password");

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) throw httpError(401, "Invalid email or password");

  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      avatarShape: user.avatarShape,
    },
  });
});

exports.me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});