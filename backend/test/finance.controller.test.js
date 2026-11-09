const test = require("node:test");
const assert = require("node:assert/strict");
const prisma = require("../src/prisma");
const finance = require("../src/controllers/finance.controller");

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
    end() {
      this.ended = true;
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

test("income listing filters income transactions by date and includes sale details", async (t) => {
  let query;
  replace(prisma.financialTransaction, "findMany", async (args) => {
    query = args;
    return [{ id: 5, amount: "42.00" }];
  }, t);

  const response = await invoke(finance.listIncome, {
    query: { from: "2026-11-01T00:00:00.000Z", to: "2026-11-30T23:59:59.999Z" },
  });

  assert.equal(response.body.length, 1);
  assert.equal(query.where.type, "INCOME");
  assert.equal(query.where.createdAt.gte.toISOString(), "2026-11-01T00:00:00.000Z");
  assert.equal(query.where.createdAt.lte.toISOString(), "2026-11-30T23:59:59.999Z");
  assert.ok(query.include.sale.include.items);
  assert.deepEqual(query.orderBy, [{ createdAt: "desc" }, { id: "desc" }]);
});

test("expense listing applies the requested date range and returns creator details", async (t) => {
  let query;
  replace(prisma.expense, "findMany", async (args) => {
    query = args;
    return [];
  }, t);

  await invoke(finance.listExpenses, { query: { from: "2026-11-09", to: "2026-11-09" } });

  assert.equal(query.where.expenseDate.gte.toISOString(), "2026-11-09T00:00:00.000Z");
  assert.equal(query.where.expenseDate.lte.toISOString(), "2026-11-09T00:00:00.000Z");
  assert.deepEqual(query.include, { createdBy: { select: { id: true, name: true } } });
});

test("expense creation validates and records the manager as creator", async (t) => {
  let createArgs;
  replace(prisma.expense, "create", async (args) => {
    createArgs = args;
    return { id: 7, ...args.data };
  }, t);

  const response = await invoke(finance.createExpense, {
    body: { category: "Rent", description: "Office rent", amount: "1200.50", date: "2026-11-09" },
    user: { id: 1 },
  });

  assert.equal(response.statusCode, 201);
  assert.equal(createArgs.data.category, "Rent");
  assert.equal(createArgs.data.description, "Office rent");
  assert.equal(createArgs.data.amount, 1200.5);
  assert.equal(createArgs.data.expenseDate.toISOString(), "2026-11-09T00:00:00.000Z");
  assert.equal(createArgs.data.createdById, 1);
});

test("expense creation rejects zero amounts and invalid calendar dates", async () => {
  await assert.rejects(invoke(finance.createExpense, {
    body: { category: "Rent", description: "Office rent", amount: "0", date: "2026-11-09" },
    user: { id: 1 },
  }), { status: 400, message: "Amount must be greater than zero" });

  await assert.rejects(invoke(finance.createExpense, {
    body: { category: "Rent", description: "Office rent", amount: "1", date: "2026-02-30" },
    user: { id: 1 },
  }), { status: 400, message: "Date must be a valid calendar date" });
});

test("expense update returns 404 when the requested expense does not exist", async (t) => {
  replace(prisma.expense, "updateMany", async () => ({ count: 0 }), t);

  await assert.rejects(invoke(finance.updateExpense, {
    params: { id: "27" },
    body: { category: "Rent", description: "Office rent", amount: "100", date: "2026-11-09" },
  }), { status: 404, message: "Expense not found" });
});

test("expense update applies the complete validated expense details", async (t) => {
  let updateArgs;
  replace(prisma.expense, "updateMany", async (args) => {
    updateArgs = args;
    return { count: 1 };
  }, t);
  replace(prisma.expense, "findUnique", async ({ where }) => ({ id: where.id, ...updateArgs.data }), t);

  const response = await invoke(finance.updateExpense, {
    params: { id: "7" },
    body: { category: "Utilities", description: "Internet service", amount: "85.75", date: "2026-11-08" },
  });

  assert.equal(updateArgs.where.id, 7);
  assert.equal(updateArgs.data.category, "Utilities");
  assert.equal(updateArgs.data.description, "Internet service");
  assert.equal(updateArgs.data.amount, 85.75);
  assert.equal(response.body.expenseDate.toISOString(), "2026-11-08T00:00:00.000Z");
});

test("expense deletion returns 204 and reports missing records", async (t) => {
  let deleteCount = 1;
  replace(prisma.expense, "deleteMany", async () => ({ count: deleteCount }), t);
  const response = await invoke(finance.deleteExpense, { params: { id: "7" } });
  assert.equal(response.statusCode, 204);
  assert.equal(response.ended, true);

  deleteCount = 0;
  await assert.rejects(invoke(finance.deleteExpense, { params: { id: "8" } }), {
    status: 404,
    message: "Expense not found",
  });
});
