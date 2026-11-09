const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const prisma = require("../src/prisma");
const account = require("../src/controllers/account.controller");
const settings = require("../src/controllers/settings.controller");

async function invoke(handler, req) {
  const response = {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  let failure;
  await handler(req, response, (error) => { failure = error; });
  if (failure) throw failure;
  return response;
}

function replace(target, key, value, t) {
  const original = target[key];
  target[key] = value;
  t.after(() => { target[key] = original; });
}

test("profile updates only the authenticated user and normalizes email", async (t) => {
  let update;
  replace(prisma.user, "findFirst", async () => null, t);
  replace(prisma.user, "update", async (args) => {
    update = args;
    return { id: 8, name: args.data.name, email: args.data.email, role: "SALES_OFFICER" };
  }, t);

  const response = await invoke(account.updateProfile, {
    body: { name: "  Ana  ", email: " ANA@EXAMPLE.COM " },
    user: { id: 8 },
  });

  assert.deepEqual(update.where, { id: 8 });
  assert.deepEqual(update.data, { name: "Ana", email: "ana@example.com" });
  assert.equal(response.body.user.email, "ana@example.com");
});

test("profile picture updates accept bounded images, shapes, and allow removing the picture", async (t) => {
  const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]);
  const avatarUrl = `data:image/png;base64,${png.toString("base64")}`;
  const updates = [];
  replace(prisma.user, "update", async (args) => {
    updates.push(args);
    return { id: 8, avatarUrl: args.data.avatarUrl };
  }, t);

  const uploaded = await invoke(account.updateProfile, {
    body: { avatarUrl, avatarShape: "RECTANGLE" },
    user: { id: 8 },
  });
  assert.equal(updates[0].data.avatarUrl, avatarUrl);
  assert.equal(updates[0].data.avatarShape, "RECTANGLE");
  assert.equal(uploaded.body.user.avatarUrl, avatarUrl);

  await invoke(account.updateProfile, {
    body: { avatarUrl: null, avatarShape: "CIRCLE" },
    user: { id: 8 },
  });
  assert.equal(updates[1].data.avatarUrl, null);
  assert.equal(updates[1].data.avatarShape, "CIRCLE");
});

test("profile picture updates reject invalid formats and images larger than 512 KB", async (t) => {
  let updated = false;
  replace(prisma.user, "update", async () => { updated = true; }, t);

  await assert.rejects(invoke(account.updateProfile, {
    body: { avatarUrl: "data:image/svg+xml;base64,PHN2Zz4=" },
    user: { id: 8 },
  }), { status: 400 });
  assert.equal(updated, false);

  const oversized = Buffer.alloc(512 * 1024 + 1);
  oversized.set([0xff, 0xd8, 0xff]);
  await assert.rejects(invoke(account.updateProfile, {
    body: { avatarUrl: `data:image/jpeg;base64,${oversized.toString("base64")}` },
    user: { id: 8 },
  }), { status: 400 });
  assert.equal(updated, false);
});

test("profile picture shape rejects unsupported values", async (t) => {
  let updated = false;
  replace(prisma.user, "update", async () => { updated = true; }, t);

  await assert.rejects(invoke(account.updateProfile, {
    body: { avatarShape: "OVAL" },
    user: { id: 8 },
  }), { status: 400 });
  assert.equal(updated, false);
});

test("password change verifies the current secret before storing a hash", async (t) => {
  let update;
  replace(prisma.user, "findUnique", async () => ({ password: "old-hash" }), t);
  replace(prisma.user, "update", async (args) => { update = args; }, t);
  replace(bcrypt, "compare", async (plain, hash) => plain === "correct old password" && hash === "old-hash", t);
  replace(bcrypt, "hash", async (plain) => `hashed:${plain}`, t);

  const response = await invoke(account.changePassword, {
    body: { currentPassword: "correct old password", newPassword: "new-password-123" },
    user: { id: 8 },
  });

  assert.deepEqual(update.where, { id: 8 });
  assert.deepEqual(update.data, { password: "hashed:new-password-123" });
  assert.equal(response.body.message, "Password updated");
});

test("notification preference updates preserve other saved categories", async (t) => {
  let update;
  replace(prisma.user, "findUnique", async () => ({
    notificationPreferences: {
      pendingSales: true,
      productRequests: false,
      lowStock: true,
      rejectedSales: true,
    },
  }), t);
  replace(prisma.user, "update", async (args) => { update = args; }, t);

  const response = await invoke(account.updateNotificationPreferences, {
    body: { lowStock: false },
    user: { id: 8 },
  });

  assert.deepEqual(update.data.notificationPreferences, {
    pendingSales: true,
    productRequests: false,
    lowStock: false,
    rejectedSales: true,
  });
  assert.deepEqual(response.body.preferences, update.data.notificationPreferences);
});

test("business setting updates validate limits and record the manager", async (t) => {
  let update;
  replace(prisma.businessSettings, "update", async (args) => {
    update = args;
    return args.data;
  }, t);

  await assert.rejects(invoke(settings.updateBusinessSettings, {
    body: { taxRate: 100.01 },
    user: { id: 1 },
  }), { status: 400 });
  assert.equal(update, undefined);

  const response = await invoke(settings.updateBusinessSettings, {
    body: { businessName: "  Example Store ", taxRate: "15.00", defaultLowStockLevel: 7 },
    user: { id: 1 },
  });
  assert.deepEqual(update.where, { id: 1 });
  assert.deepEqual(update.data, { businessName: "Example Store", taxRate: 15, defaultLowStockLevel: 7, updatedById: 1 });
  assert.equal(response.body.updatedById, 1);
});
