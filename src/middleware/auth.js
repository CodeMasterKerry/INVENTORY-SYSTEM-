const jwt = require("jsonwebtoken");
const prisma = require("../prisma");
const { asyncHandler, httpError } = require("../utils/helpers");

// Checks: is the person logged in?
const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw httpError(401, "Please log in first");

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw httpError(401, "Invalid or expired token");
  }

  const user = await prisma.user.findUnique({ where: { id: payload.id } });
  if (!user || !user.isActive) throw httpError(401, "Account not available");

  req.user = { id: user.id, name: user.name, email: user.email, role: user.role };
  next();
});

// Checks: is their role allowed here?
const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(httpError(403, "You are not allowed to do this"));
  }
  next();
};

module.exports = { authenticate, requireRole };