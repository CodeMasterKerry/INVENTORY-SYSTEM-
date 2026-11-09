const test = require("node:test");
const assert = require("node:assert/strict");
const prisma = require("../src/prisma");
const products = require("../src/controllers/products.controller");

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

test("product creation persists description/unit and logs initial stock attribution/snapshots", async (t) => {
  let productData;
  let movementData;
  const tx = {
    product: {
      create: async ({ data }) => {
        productData = data;
        return { id: 17, ...data };
      },
    },
    inventoryTransaction: {
      create: async ({ data }) => { movementData = data; },
    },
  };
  replace(prisma.product, "findUnique", async () => null, t);
  replace(prisma.category, "findUnique", async () => ({ id: 4 }), t);
  replace(prisma, "$transaction", async (callback) => callback(tx), t);

  const response = await invoke(products.createProduct, {
    body: {
      name: "Adapter",
      sku: "ADP-17",
      costPrice: "4.20",
      sellingPrice: "8.50",
      quantity: 6,
      lowStockLevel: 2,
      categoryId: 4,
      description: "USB power adapter",
      unit: "piece",
    },
    user: { id: 3, role: "MANAGER" },
  });

  assert.equal(response.statusCode, 201);
  assert.equal(productData.description, "USB power adapter");
  assert.equal(productData.unit, "piece");
  assert.equal(productData.updatedAt, undefined);
  assert.equal(productData.isApproved, true);
  assert.deepEqual(movementData, {
    productId: 17,
    type: "IN",
    quantity: 6,
    reason: "Initial stock",
    createdById: 3,
    quantityBefore: 0,
    quantityAfter: 6,
  });
});

test("product creation uses the saved business low-stock default when omitted", async (t) => {
  let created;
  const tx = {
    product: { create: async ({ data }) => { created = data; return { id: 21, ...data }; } },
    inventoryTransaction: { create: async () => assert.fail("zero initial stock must not create a movement") },
  };
  replace(prisma.businessSettings, "findUnique", async () => ({ defaultLowStockLevel: 9 }), t);
  replace(prisma.product, "findUnique", async () => null, t);
  replace(prisma.category, "findUnique", async () => ({ id: 4 }), t);
  replace(prisma, "$transaction", async (callback) => callback(tx), t);

  await invoke(products.createProduct, {
    body: {
      name: "Adapter",
      sku: "ADP-21",
      costPrice: "4.20",
      sellingPrice: "8.50",
      categoryId: 4,
    },
    user: { id: 3, role: "MANAGER" },
  });

  assert.equal(created.lowStockLevel, 9);
});

test("restock records actor and exact before/after stock", async (t) => {
  let movementData;
  let transactionOptions;
  const tx = {
    product: {
      findUnique: async ({ select }) => select ? { quantity: 8 } : { id: 17, quantity: 11 },
      updateMany: async ({ where, data }) => {
        assert.deepEqual(where, { id: 17 });
        assert.deepEqual(data, { quantity: { increment: 3 } });
        return { count: 1 };
      },
    },
    inventoryTransaction: {
      create: async ({ data }) => { movementData = data; },
    },
  };
  replace(prisma, "$transaction", async (callback, options) => {
    transactionOptions = options;
    return callback(tx);
  }, t);

  await invoke(products.restockProduct, {
    params: { id: "17" },
    body: { quantity: 3, reason: "Delivery" },
    user: { id: 5 },
  });

  assert.deepEqual(transactionOptions, { isolationLevel: "Serializable" });
  assert.equal(movementData.createdById, 5);
  assert.equal(movementData.quantityBefore, 8);
  assert.equal(movementData.quantityAfter, 11);
  assert.equal(movementData.reason, "Delivery");
});

test("product rejection stores manager and reason without changing pending product approval", async (t) => {
  let update;
  replace(prisma.product, "updateMany", async (args) => {
    update = args;
    return { count: 1 };
  }, t);
  replace(prisma.product, "findUnique", async () => ({ id: 17, isApproved: false, rejectionReason: "Duplicate SKU" }), t);

  const response = await invoke(products.rejectProduct, {
    params: { id: "17" },
    body: { reason: "Duplicate SKU" },
    user: { id: 1 },
  });

  assert.deepEqual(update.where, { id: 17, isApproved: false, rejectedAt: null });
  assert.equal(update.data.rejectionReason, "Duplicate SKU");
  assert.equal(update.data.rejectedById, 1);
  assert.ok(update.data.rejectedAt instanceof Date);
  assert.equal(response.body.isApproved, false);
});

test("product requests support server-side submission date filtering", async (t) => {
  let where;
  replace(prisma.product, "findMany", async (args) => {
    where = args.where;
    return [];
  }, t);

  await invoke(products.listProducts, {
    query: { from: "2026-11-01T00:00:00.000Z", to: "2026-11-05T23:59:59.999Z" },
    user: { id: 1, role: "MANAGER" },
  });

  assert.deepEqual(where.createdAt, {
    gte: new Date("2026-11-01T00:00:00.000Z"),
    lte: new Date("2026-11-05T23:59:59.999Z"),
  });
});

test("stock history applies validated server-side dates and returns the complete result set", async (t) => {
  let query;
  const history = Array.from({ length: 205 }, (_, id) => ({ id }));
  replace(prisma.inventoryTransaction, "findMany", async (args) => {
    query = args;
    return history;
  }, t);

  const response = await invoke(products.stockHistory, {
    query: { from: "2026-11-01T00:00:00.000Z", to: "2026-11-05T23:59:59.999Z" },
  });

  assert.deepEqual(query.where.createdAt, {
    gte: new Date("2026-11-01T00:00:00.000Z"),
    lte: new Date("2026-11-05T23:59:59.999Z"),
  });
  assert.equal("take" in query, false);
  assert.equal(response.body.length, 205);
});

test("stock history rejects invalid or reversed date ranges", async (t) => {
  let queried = false;
  replace(prisma.inventoryTransaction, "findMany", async () => {
    queried = true;
    return [];
  }, t);

  await assert.rejects(invoke(products.stockHistory, { query: { from: "not-a-date" } }), { status: 400 });
  await assert.rejects(invoke(products.stockHistory, {
    query: { from: "2026-11-05T00:00:00.000Z", to: "2026-11-01T00:00:00.000Z" },
  }), { status: 400 });
  assert.equal(queried, false);
});
