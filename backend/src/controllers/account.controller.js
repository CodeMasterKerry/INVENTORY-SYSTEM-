const bcrypt = require("bcryptjs");
const prisma = require("../prisma");
const { asyncHandler, httpError } = require("../utils/helpers");
const { emailAddress, rejectUnknownFields, requireObject, requiredString } = require("../utils/validation");

const profileFields = {
  id: true, name: true, email: true, role: true, avatarUrl: true, avatarShape: true, isActive: true, createdAt: true,
};
const MAX_AVATAR_BYTES = 512 * 1024;
const preferenceFields = ["pendingSales", "productRequests", "lowStock", "rejectedSales"];
const defaultPreferences = {
  pendingSales: true,
  productRequests: true,
  lowStock: true,
  rejectedSales: true,
};

function validatePreferences(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw httpError(500, "Stored notification preferences are invalid");
  }
  const preferences = { ...defaultPreferences };
  for (const key of preferenceFields) {
    if (typeof value[key] !== "boolean") throw httpError(500, "Stored notification preferences are invalid");
    preferences[key] = value[key];
  }
  return preferences;
}

function validateAvatar(value) {
  if (value === null) return null;
  if (typeof value !== "string") throw httpError(400, "Profile picture must be an image");

  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) throw httpError(400, "Profile picture must be a JPEG, PNG, or WebP image");

  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length > MAX_AVATAR_BYTES) throw httpError(400, "Profile picture must be 512 KB or smaller");
  if (bytes.toString("base64") !== match[2]) throw httpError(400, "Profile picture data is invalid");

  const isJpeg = match[1] === "jpeg" && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = match[1] === "png" && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const isWebp = match[1] === "webp" && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  if (!isJpeg && !isPng && !isWebp) throw httpError(400, "Profile picture data is invalid");

  return value;
}

exports.getProfile = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { ...profileFields, notificationPreferences: true },
  });
  if (!user) throw httpError(404, "Account not found");
  res.json({ user });
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const body = requireObject(req.body);
  rejectUnknownFields(body, ["name", "email", "avatarUrl", "avatarShape"]);
  if (!Object.keys(body).length) throw httpError(400, "At least one field is required");

  const data = {};
  if (body.name !== undefined) data.name = requiredString(body.name, "Name", { max: 120 });
  if (body.avatarUrl !== undefined) data.avatarUrl = validateAvatar(body.avatarUrl);
  if (body.avatarShape !== undefined) {
    if (!["CIRCLE", "RECTANGLE"].includes(body.avatarShape)) {
      throw httpError(400, "Profile picture shape must be CIRCLE or RECTANGLE");
    }
    data.avatarShape = body.avatarShape;
  }
  if (body.email !== undefined) {
    data.email = emailAddress(body.email);
    const duplicate = await prisma.user.findFirst({
      where: { id: { not: req.user.id }, email: { equals: data.email, mode: "insensitive" } },
      select: { id: true },
    });
    if (duplicate) throw httpError(409, "Email already in use");
  }

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data,
    select: { ...profileFields, notificationPreferences: true },
  });
  res.json({ user });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const body = requireObject(req.body);
  rejectUnknownFields(body, ["currentPassword", "newPassword"]);
  if (typeof body.currentPassword !== "string" || !body.currentPassword || body.currentPassword.length > 1024) {
    throw httpError(400, "Current password is required");
  }
  if (typeof body.newPassword !== "string" || body.newPassword.length < 8 || body.newPassword.length > 1024) {
    throw httpError(400, "New password must be between 8 and 1024 characters");
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { password: true } });
  if (!user) throw httpError(404, "Account not found");
  if (!await bcrypt.compare(body.currentPassword, user.password)) {
    throw httpError(400, "Current password is incorrect");
  }
  await prisma.user.update({
    where: { id: req.user.id },
    data: { password: await bcrypt.hash(body.newPassword, 10) },
  });
  res.json({ message: "Password updated" });
});

exports.getNotificationPreferences = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { notificationPreferences: true },
  });
  if (!user) throw httpError(404, "Account not found");
  res.json({ preferences: validatePreferences(user.notificationPreferences) });
});

exports.updateNotificationPreferences = asyncHandler(async (req, res) => {
  const body = requireObject(req.body);
  rejectUnknownFields(body, preferenceFields);
  if (!Object.keys(body).length) throw httpError(400, "At least one preference is required");
  for (const [key, value] of Object.entries(body)) {
    if (typeof value !== "boolean") throw httpError(400, `${key} must be true or false`);
  }

  const current = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { notificationPreferences: true },
  });
  if (!current) throw httpError(404, "Account not found");
  const preferences = { ...validatePreferences(current.notificationPreferences), ...body };
  await prisma.user.update({
    where: { id: req.user.id },
    data: { notificationPreferences: preferences },
  });
  res.json({ preferences });
});
