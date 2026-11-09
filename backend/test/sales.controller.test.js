const test = require("node:test");
const assert = require("node:assert/strict");
const prisma = require("../src/prisma");
const sales = require("../src/controllers/sales.controller");

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

function mockAutoApproval(t) {
  const tx = {
    sale: { create: (args) => prisma.sale.create(args) },
    product: {
      updateMany: async () => ({ count: 1 }),
      findUnique: async () => ({ name: "Adapter", quantity: 9 }),
    },
    inventoryTransaction: { create: async () => ({}) },
    financialTransaction: { create: async () => ({}) },
  };
  replace(prisma, "$transaction", async (callback) => callback(tx), t);
}

test("sale creation merges duplicate product lines before stock checks and pricing", async (t) => {
  let createArgs;
  mockAutoApproval(t);
  replace(prisma.businessSettings, "findUnique", async () => ({ taxRate: "15.00" }), t);
  replace(prisma.product, "findMany", async () => [
    { id: 8, name: "Adapter", sellingPrice: "12.35", costPrice: "4.20", quantity: 9, isApproved: true },
  ], t);
  replace(prisma.sale, "create", async (args) => {
    createArgs = args;
    return { id: 41, status: "PENDING", ...args.data };
  }, t);

  const response = await invoke(sales.createSale, {
    body: {
      items: [{ productId: 8, quantity: 2 }, { productId: "8", quantity: 3 }],
      paymentMethod: "CASH",
      notes: "Counter sale",
    },
    user: { id: 2 },
  });

  assert.equal(response.statusCode, 201);
  assert.equal(createArgs.data.subtotalAmount, 61.75);
  assert.equal(createArgs.data.discountPercent, 0);
  assert.equal(createArgs.data.discountAmount, 0);
  assert.equal(createArgs.data.taxRate, 15);
  assert.equal(createArgs.data.taxAmount, 9.26);
  assert.equal(createArgs.data.totalAmount, 71.01);
  assert.deepEqual(createArgs.data.items.create, [{ productId: 8, quantity: 5, unitPrice: 12.35, unitCost: 4.2 }]);
  assert.equal(createArgs.data.createdById, 2);
  assert.equal(createArgs.data.status, "APPROVED");
  assert.equal(createArgs.data.paymentMethod, "CASH");
  assert.equal(createArgs.data.notes, "Counter sale");
  assert.match(createArgs.data.invoiceNo, /^INV-\d{8}-[A-F0-9]{10}$/);
});

test("sale creation rejects combined quantities greater than available stock", async (t) => {
  let saleCreated = false;
  replace(prisma.businessSettings, "findUnique", async () => ({ taxRate: "15.00" }), t);
  replace(prisma.product, "findMany", async () => [
    { id: 8, name: "Adapter", sellingPrice: "12.35", costPrice: "4.20", quantity: 4, isApproved: true },
  ], t);
  replace(prisma.sale, "create", async () => {
    saleCreated = true;
    return {};
  }, t);

  await assert.rejects(invoke(sales.createSale, {
    body: { items: [{ productId: 8, quantity: 2 }, { productId: 8, quantity: 3 }] },
    user: { id: 2 },
  }), { status: 400 });
  assert.equal(saleCreated, false);
});

test("invoice collisions are retried without changing the sale contract", async (t) => {
  let attempts = 0;
  mockAutoApproval(t);
  replace(prisma.businessSettings, "findUnique", async () => ({ taxRate: "0.00" }), t);
  replace(prisma.product, "findMany", async () => [
    { id: 8, name: "Adapter", sellingPrice: "1.00", costPrice: "0.50", quantity: 2, isApproved: true },
  ], t);
  replace(prisma.sale, "create", async (args) => {
    attempts += 1;
    if (attempts === 1) {
      const error = new Error("unique constraint");
      error.code = "P2002";
      error.meta = { target: ["invoiceNo"] };
      throw error;
    }
    return { id: 21, ...args.data };
  }, t);

  const response = await invoke(sales.createSale, {
    body: { items: [{ productId: 8, quantity: 1 }] },
    user: { id: 2 },
  });
  assert.equal(attempts, 2);
  assert.equal(response.statusCode, 201);
  assert.equal(response.body.status, "APPROVED");
  assert.equal(response.body.paymentMethod, null);
});

test("sale creation applies a percentage discount before VAT and accepts mobile payments", async (t) => {
  let createArgs;
  mockAutoApproval(t);
  replace(prisma.businessSettings, "findUnique", async () => ({ taxRate: "15.00" }), t);
  replace(prisma.product, "findMany", async () => [
    { id: 8, name: "Adapter", sellingPrice: "12.35", costPrice: "4.20", quantity: 9, isApproved: true },
  ], t);
  replace(prisma.sale, "create", async (args) => {
    createArgs = args;
    return { id: 42, ...args.data };
  }, t);

  const response = await invoke(sales.createSale, {
    body: {
      items: [{ productId: 8, quantity: 5 }],
      paymentMethod: "MOBILE",
      discountPercent: 10,
    },
    user: { id: 2 },
  });

  assert.equal(response.statusCode, 201);
  assert.equal(createArgs.data.subtotalAmount, 61.75);
  assert.equal(createArgs.data.discountPercent, 10);
  assert.equal(createArgs.data.discountAmount, 6.18);
  assert.equal(createArgs.data.taxRate, 15);
  assert.equal(createArgs.data.taxAmount, 8.34);
  assert.equal(createArgs.data.totalAmount, 63.91);
  assert.equal(createArgs.data.paymentMethod, "MOBILE");
});

test("sales of exactly 50,000 birr are completed without manager approval", async (t) => {
  let createArgs;
  let movementCount = 0;
  let incomeCount = 0;
  const tx = {
    sale: { create: async (args) => {
      createArgs = args;
      return { id: 61, ...args.data };
    } },
    product: {
      updateMany: async () => ({ count: 1 }),
      findUnique: async () => ({ quantity: 4 }),
    },
    inventoryTransaction: { create: async () => { movementCount += 1; } },
    financialTransaction: { create: async ({ data }) => {
      incomeCount += 1;
      assert.equal(data.saleId, 61);
      assert.equal(data.amount, 50000);
    } },
  };
  replace(prisma, "$transaction", async (callback, options) => {
    assert.deepEqual(options, { isolationLevel: "Serializable" });
    return callback(tx);
  }, t);
  replace(prisma.businessSettings, "findUnique", async () => ({ taxRate: "0.00" }), t);
  replace(prisma.product, "findMany", async () => [
    { id: 8, name: "Adapter", sellingPrice: "50000.00", costPrice: "4.20", quantity: 5, isApproved: true },
  ], t);

  const response = await invoke(sales.createSale, {
    body: { items: [{ productId: 8, quantity: 1 }] },
    user: { id: 2 },
  });

  assert.equal(createArgs.data.totalAmount, 50000);
  assert.equal(createArgs.data.status, "APPROVED");
  assert.equal(response.body.status, "APPROVED");
  assert.equal(movementCount, 1);
  assert.equal(incomeCount, 1);
});

test("sales over 50,000 birr after VAT wait for manager approval", async (t) => {
  let createArgs;
  let created;
  replace(prisma.businessSettings, "findUnique", async () => ({ taxRate: "15.00" }), t);
  replace(prisma.product, "findMany", async () => [
    { id: 8, name: "Adapter", sellingPrice: "43478.27", costPrice: "4.20", quantity: 5, isApproved: true },
  ], t);
  replace(prisma.sale, "create", async (args) => {
    createArgs = args;
    created = args.data;
    return { id: 62, ...args.data };
  }, t);
  replace(prisma, "$transaction", async () => assert.fail("large sales must wait for manager approval"), t);

  const response = await invoke(sales.createSale, {
    body: { items: [{ productId: 8, quantity: 1 }] },
    user: { id: 2 },
  });

  assert.equal(createArgs.data.totalAmount, 50000.01);
  assert.equal(created.status, "PENDING");
  assert.equal(response.body.status, "PENDING");
});

test("sale creation rejects discounts over 100 percent", async (t) => {
  let created = false;
  mockAutoApproval(t);
  replace(prisma.businessSettings, "findUnique", async () => ({ taxRate: "15.00" }), t);
  replace(prisma.product, "findMany", async () => [
    { id: 8, name: "Adapter", sellingPrice: "1.00", costPrice: "0.50", quantity: 2, isApproved: true },
  ], t);
  replace(prisma.sale, "create", async () => { created = true; return {}; }, t);

  await assert.rejects(invoke(sales.createSale, {
    body: { items: [{ productId: 8, quantity: 1 }], discountPercent: 100.01 },
    user: { id: 2 },
  }), { status: 400 });
  assert.equal(created, false);
});

test("sale creation rejects unsupported payment methods before creating a sale", async (t) => {
  let created = false;
  replace(prisma.product, "findMany", async () => [
    { id: 8, name: "Adapter", sellingPrice: "1.00", costPrice: "0.50", quantity: 2, isApproved: true },
  ], t);
  replace(prisma.sale, "create", async () => {
    created = true;
    return {};
  }, t);

  await assert.rejects(invoke(sales.createSale, {
    body: { items: [{ productId: 8, quantity: 1 }], paymentMethod: "CARD" },
    user: { id: 2 },
  }), { status: 400 });
  assert.equal(created, false);
});

test("sales history applies server-side date, status, and officer ownership filters", async (t) => {
  let where;
  replace(prisma.sale, "findMany", async (args) => {
    where = args.where;
    return [];
  }, t);

  await invoke(sales.listSales, {
    query: {
      status: "APPROVED",
      dateField: "approvedAt",
      from: "2026-11-01T00:00:00.000Z",
      to: "2026-11-05T23:59:59.999Z",
    },
    user: { id: 12, role: "SALES_OFFICER" },
  });

  assert.deepEqual(where, {
    createdById: 12,
    status: "APPROVED",
    AND: [{
      OR: [
        {
          approvedAt: {
            gte: new Date("2026-11-01T00:00:00.000Z"),
            lte: new Date("2026-11-05T23:59:59.999Z"),
          },
        },
        {
          approvedAt: null,
          status: "APPROVED",
          createdAt: {
            gte: new Date("2026-11-01T00:00:00.000Z"),
            lte: new Date("2026-11-05T23:59:59.999Z"),
          },
        },
      ],
    }],
  });
});

test("rejection date filters include legacy rejected sales without a rejection timestamp", async (t) => {
  let where;
  replace(prisma.sale, "findMany", async (args) => {
    where = args.where;
    return [];
  }, t);

  await invoke(sales.listSales, {
    query: {
      status: "REJECTED",
      dateField: "rejectedAt",
      from: "2026-11-01T00:00:00.000Z",
      to: "2026-11-05T23:59:59.999Z",
    },
    user: { id: 1, role: "MANAGER" },
  });

  assert.deepEqual(where.AND[0].OR[1], {
    rejectedAt: null,
    status: "REJECTED",
    createdAt: {
      gte: new Date("2026-11-01T00:00:00.000Z"),
      lte: new Date("2026-11-05T23:59:59.999Z"),
    },
  });
});

test("approval atomically guards stock, logs one combined movement, and records income", async (t) => {
  let remaining = 7;
  let movementCount = 0;
  let incomeCount = 0;
  let statusUpdateCount = 0;
  let transactionOptions;
  const tx = {
    sale: {
      findUnique: async () => ({
        id: 15,
        invoiceNo: "INV-TEST",
        status: "PENDING",
        totalAmount: "61.75",
        subtotalAmount: "65.93",
        discountAmount: "4.18",
        items: [
          { productId: 8, quantity: 2 },
          { productId: 8, quantity: 3 },
        ],
      }),
      updateMany: async ({ where }) => {
        assert.deepEqual(where, { id: 15, status: "PENDING" });
        statusUpdateCount += 1;
        return { count: 1 };
      },
    },
    product: {
      updateMany: async ({ where, data }) => {
        assert.deepEqual(where, { id: 8, quantity: { gte: 5 } });
        remaining -= data.quantity.decrement;
        return { count: 1 };
      },
      findUnique: async () => ({ name: "Adapter", quantity: remaining }),
    },
    inventoryTransaction: { create: async ({ data }) => {
      movementCount += 1;
      assert.equal(data.createdById, 1);
      assert.equal(data.quantityBefore, 7);
      assert.equal(data.quantityAfter, 2);
    } },
    financialTransaction: { create: async ({ data }) => {
      incomeCount += 1;
      assert.equal(data.amount, 61.75);
    } },
  };
  replace(prisma, "$transaction", async (callback, options) => {
    transactionOptions = options;
    return callback(tx);
  }, t);

  const response = await invoke(sales.approveSale, {
    params: { id: "15" },
    user: { id: 1 },
  });

  assert.equal(response.body.message, "Sale approved");
  assert.deepEqual(transactionOptions, { isolationLevel: "Serializable" });
  assert.equal(remaining, 2);
  assert.equal(movementCount, 1);
  assert.equal(statusUpdateCount, 1);
  assert.equal(incomeCount, 1);
});

test("failed stock guard aborts approval before sale transition or income creation", async (t) => {
  let incomeCount = 0;
  let saleTransitionCount = 0;
  const tx = {
    sale: {
      findUnique: async () => ({
        id: 15,
        invoiceNo: "INV-TEST",
        status: "PENDING",
        items: [{ productId: 8, quantity: 4 }],
      }),
      updateMany: async () => { saleTransitionCount += 1; return { count: 1 }; },
    },
    product: {
      updateMany: async () => ({ count: 0 }),
      findUnique: async () => ({ name: "Adapter", quantity: 3 }),
    },
    inventoryTransaction: { create: async () => assert.fail("movement must roll back/not be written") },
    financialTransaction: { create: async () => { incomeCount += 1; } },
  };
  replace(prisma, "$transaction", async (callback) => callback(tx), t);

  await assert.rejects(invoke(sales.approveSale, {
    params: { id: "15" },
    user: { id: 1 },
  }), { status: 409 });
  assert.equal(saleTransitionCount, 0);
  assert.equal(incomeCount, 0);
});

test("rejection records reason and reviewer separately without touching stock or income", async (t) => {
  let update;
  replace(prisma.sale, "updateMany", async ({ where, data }) => {
    assert.deepEqual(where, { id: 15, status: "PENDING" });
    update = data;
    return { count: 1 };
  }, t);

  const response = await invoke(sales.rejectSale, {
    params: { id: "15" },
    body: { reason: "Customer details are incomplete" },
    user: { id: 1 },
  });
  assert.equal(response.body.message, "Sale rejected");
  assert.equal(update.status, "REJECTED");
  assert.equal(update.rejectedById, 1);
  assert.equal(update.rejectionReason, "Customer details are incomplete");
  assert.ok(update.rejectedAt instanceof Date);
  assert.equal("approvedAt" in update, false);
  assert.equal("approvedById" in update, false);
});

test("sale rejection requires a non-empty reason", async (t) => {
  let updated = false;
  replace(prisma.sale, "updateMany", async () => {
    updated = true;
    return { count: 1 };
  }, t);

  await assert.rejects(invoke(sales.rejectSale, {
    params: { id: "15" },
    body: { reason: "   " },
    user: { id: 1 },
  }), { status: 400 });
  assert.equal(updated, false);
});
