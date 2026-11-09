const test = require("node:test");
const assert = require("node:assert/strict");
const prisma = require("../src/prisma");
const dashboard = require("../src/controllers/dashboard.controller");

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

test("manager dashboard filters by approved date and calculates profit from saved costs", async (t) => {
  let revenueWhere;
  let salesWhere;
  replace(prisma.sale, "aggregate", async ({ where }) => {
    revenueWhere = where;
    return { _sum: { subtotalAmount: "52.00", discountAmount: "2.00" } };
  }, t);
  replace(prisma.sale, "findMany", async ({ where }) => {
    salesWhere = where;
    return [
      {
        discountAmount: "2.00",
        items: [
          { unitPrice: "10.00", unitCost: "4.00", quantity: 2 },
          { unitPrice: "8.00", unitCost: null, quantity: 1 },
        ],
      },
    ];
  }, t);
  replace(prisma.sale, "count", async () => 1, t);
  replace(prisma.product, "count", async () => 2, t);
  replace(prisma.user, "count", async () => 3, t);
  replace(prisma.product, "findMany", async () => [], t);

  const response = await invoke(dashboard.managerDashboard, {
    query: { from: "2026-11-01T00:00:00.000Z", to: "2026-11-05T23:59:59.999Z" },
  });

  const expectedRange = {
    gte: new Date("2026-11-01T00:00:00.000Z"),
    lte: new Date("2026-11-05T23:59:59.999Z"),
  };
  const expectedApprovedWhere = {
    status: "APPROVED",
    OR: [
      { approvedAt: expectedRange },
      { approvedAt: null, status: "APPROVED", createdAt: expectedRange },
    ],
  };
  assert.deepEqual(revenueWhere, expectedApprovedWhere);
  assert.deepEqual(salesWhere, expectedApprovedWhere);
  assert.equal(response.body.revenue, 50);
  assert.equal(response.body.profit, 10);
  assert.equal(response.body.unknownCostLines, 1);
});

test("officer dashboard filters legacy approved and rejected sales by creation date", async (t) => {
  const aggregateWhere = [];
  const countWhere = [];
  replace(prisma.sale, "aggregate", async ({ where }) => {
    aggregateWhere.push(where);
    return { _sum: { subtotalAmount: 0, discountAmount: 0 }, _count: 0 };
  }, t);
  replace(prisma.sale, "count", async ({ where }) => {
    countWhere.push(where);
    return 0;
  }, t);

  await invoke(dashboard.officerDashboard, {
    query: { from: "2026-11-01T00:00:00.000Z", to: "2026-11-05T23:59:59.999Z" },
    user: { id: 8 },
  });

  const expectedRange = {
    gte: new Date("2026-11-01T00:00:00.000Z"),
    lte: new Date("2026-11-05T23:59:59.999Z"),
  };
  assert.deepEqual(aggregateWhere[0], {
    createdById: 8,
    status: "APPROVED",
    OR: [
      { approvedAt: expectedRange },
      { approvedAt: null, status: "APPROVED", createdAt: expectedRange },
    ],
  });
  assert.deepEqual(countWhere, [
    { createdById: 8, status: "PENDING", createdAt: expectedRange },
    {
      createdById: 8,
      status: "REJECTED",
      OR: [
        { rejectedAt: expectedRange },
        { rejectedAt: null, status: "REJECTED", createdAt: expectedRange },
      ],
    },
  ]);
});
