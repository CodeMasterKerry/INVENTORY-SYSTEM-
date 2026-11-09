const test = require("node:test");
const assert = require("node:assert/strict");
const prisma = require("../src/prisma");
const requests = require("../src/controllers/product-update-requests.controller");

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

const proposalBody = {
  name: "USB Adapter Pro",
  costPrice: "5.25",
  sellingPrice: "10.50",
  lowStockLevel: 8,
  categoryId: 3,
  description: "Updated adapter description",
  unit: "piece",
};

test("officer update request validates the category and stores proposed changes without editing the product", async (t) => {
  let createArgs;
  replace(prisma.product, "findUnique", async () => ({ id: 12, isApproved: true }), t);
  replace(prisma.category, "findUnique", async () => ({ id: 3 }), t);
  replace(prisma.productUpdateRequest, "findFirst", async () => null, t);
  replace(prisma.productUpdateRequest, "create", async (args) => {
    createArgs = args;
    return { id: 4, ...args.data };
  }, t);

  const response = await invoke(requests.create, {
    params: { id: "12" },
    body: proposalBody,
    user: { id: 7 },
  });

  assert.equal(response.statusCode, 201);
  assert.equal(createArgs.data.productId, 12);
  assert.equal(createArgs.data.requestedById, 7);
  assert.equal(createArgs.data.proposedName, "USB Adapter Pro");
  assert.equal(createArgs.data.proposedCostPrice, 5.25);
  assert.equal(createArgs.data.proposedSellingPrice, 10.5);
  assert.equal(createArgs.data.proposedCategoryId, 3);
  assert.equal(createArgs.data.status, undefined);
});

test("officers cannot submit updates for unapproved products or products with pending changes", async (t) => {
  replace(prisma.product, "findUnique", async () => ({ id: 12, isApproved: false }), t);
  replace(prisma.category, "findUnique", async () => ({ id: 3 }), t);
  replace(prisma.productUpdateRequest, "findFirst", async () => null, t);
  await assert.rejects(invoke(requests.create, {
    params: { id: "12" }, body: proposalBody, user: { id: 7 },
  }), { status: 404 });

  replace(prisma.product, "findUnique", async () => ({ id: 12, isApproved: true }), t);
  replace(prisma.productUpdateRequest, "findFirst", async () => ({ id: 2 }), t);
  await assert.rejects(invoke(requests.create, {
    params: { id: "12" }, body: proposalBody, user: { id: 7 },
  }), { status: 409, message: "This product already has a pending update request" });
});

test("manager listing returns only pending requests ordered newest first", async (t) => {
  let query;
  replace(prisma.productUpdateRequest, "findMany", async (args) => {
    query = args;
    return [];
  }, t);

  await invoke(requests.listPending, { query: { from: "2026-11-01", to: "2026-11-30" } });

  assert.equal(query.where.status, "PENDING");
  assert.equal(query.where.createdAt.gte.toISOString(), "2026-11-01T00:00:00.000Z");
  assert.deepEqual(query.orderBy, [{ createdAt: "desc" }, { id: "desc" }]);
  assert.ok(query.include.proposedCategory);
});

test("manager approval applies proposal and records reviewer atomically", async (t) => {
  const applied = {};
  const pendingRequest = {
    id: 4,
    productId: 12,
    status: "PENDING",
    proposedName: "USB Adapter Pro",
    proposedCostPrice: 5.25,
    proposedSellingPrice: 10.5,
    proposedLowStockLevel: 8,
    proposedCategoryId: 3,
    proposedDescription: "Updated adapter description",
    proposedUnit: "piece",
  };
  const tx = {
    productUpdateRequest: {
      findFirst: async () => pendingRequest,
      updateMany: async ({ where, data }) => {
        assert.deepEqual(where, { id: 4, status: "PENDING" });
        applied.request = data;
        return { count: 1 };
      },
      findUnique: async () => ({ ...pendingRequest, status: "APPROVED" }),
    },
    product: {
      update: async ({ where, data }) => {
        applied.productId = where.id;
        applied.product = data;
      },
    },
  };
  replace(prisma, "$transaction", async (callback) => callback(tx), t);

  const response = await invoke(requests.approve, {
    params: { id: "4" },
    user: { id: 1 },
  });

  assert.equal(applied.productId, 12);
  assert.equal(applied.product.name, "USB Adapter Pro");
  assert.equal(applied.product.categoryId, 3);
  assert.equal(applied.request.status, "APPROVED");
  assert.equal(applied.request.reviewedById, 1);
  assert.equal(response.body.status, "APPROVED");
});

test("manager rejection requires a reason and only updates a pending request", async (t) => {
  let update;
  replace(prisma.productUpdateRequest, "updateMany", async (args) => {
    update = args;
    return { count: 1 };
  }, t);
  replace(prisma.productUpdateRequest, "findUnique", async () => ({ id: 4, status: "REJECTED" }), t);

  const response = await invoke(requests.reject, {
    params: { id: "4" },
    body: { reason: "Price change is unsupported" },
    user: { id: 1 },
  });

  assert.deepEqual(update.where, { id: 4, status: "PENDING" });
  assert.equal(update.data.status, "REJECTED");
  assert.equal(update.data.rejectionReason, "Price change is unsupported");
  await assert.rejects(invoke(requests.reject, {
    params: { id: "4" }, body: {}, user: { id: 1 },
  }), { status: 400 });
});
