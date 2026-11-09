const test = require("node:test");
const assert = require("node:assert/strict");
const { dateRange, dateRangeWhere, integer, money, requiredString, emailAddress } = require("../src/utils/validation");
const { withSerializationRetry } = require("../src/utils/helpers");

test("integer validation accepts bounded whole numbers and rejects invalid quantities", () => {
  assert.equal(integer("4", "Quantity", { min: 1 }), 4);
  assert.throws(() => integer(0.5, "Quantity"), { status: 400 });
  assert.throws(() => integer(-1, "Quantity"), { status: 400 });
  assert.throws(() => integer("1e2", "Quantity"), { status: 400 });
});

test("money validation matches Decimal(10,2) non-negative values", () => {
  assert.equal(money("12.34", "Price"), 12.34);
  assert.equal(money(0, "Price"), 0);
  assert.throws(() => money("-1.00", "Price"), { status: 400 });
  assert.throws(() => money("1.234", "Price"), { status: 400 });
  assert.throws(() => money("100000000.00", "Price"), { status: 400 });
});

test("text validation trims names and normalizes email addresses", () => {
  assert.equal(requiredString("  New name  ", "Name"), "New name");
  assert.equal(emailAddress("  PERSON@EXAMPLE.COM "), "person@example.com");
  assert.throws(() => emailAddress("not-an-email"), { status: 400 });
});

test("date range validation returns inclusive bounds and rejects malformed or reversed inputs", () => {
  assert.deepEqual(dateRange({
    from: "2026-11-01T00:00:00.000Z",
    to: "2026-11-30T23:59:59.999Z",
  }), {
    gte: new Date("2026-11-01T00:00:00.000Z"),
    lte: new Date("2026-11-30T23:59:59.999Z"),
  });
  assert.throws(() => dateRange({ from: "yesterday" }), { status: 400 });
  assert.throws(() => dateRange({
    from: "2026-11-30T00:00:00.000Z",
    to: "2026-11-01T00:00:00.000Z",
  }), { status: 400 });
});

test("date range filters include legacy status records by creation date", () => {
  const query = {
    from: "2026-11-01T00:00:00.000Z",
    to: "2026-11-05T23:59:59.999Z",
  };
  const range = {
    gte: new Date(query.from),
    lte: new Date(query.to),
  };

  assert.deepEqual(dateRangeWhere(query, "approvedAt", "APPROVED"), {
    OR: [
      { approvedAt: range },
      { approvedAt: null, status: "APPROVED", createdAt: range },
    ],
  });
  assert.deepEqual(dateRangeWhere(query, "createdAt"), { createdAt: range });
  assert.deepEqual(dateRangeWhere({}, "approvedAt", "APPROVED"), {});
});

test("serializable transactions retry Prisma write conflicts a bounded number of times", async () => {
  let attempts = 0;
  const result = await withSerializationRetry(async () => {
    attempts += 1;
    if (attempts < 3) {
      const error = new Error("serialization conflict");
      error.code = "P2034";
      throw error;
    }
    return "committed";
  });
  assert.equal(result, "committed");
  assert.equal(attempts, 3);

  let failedAttempts = 0;
  await assert.rejects(withSerializationRetry(async () => {
    failedAttempts += 1;
    const error = new Error("not retryable");
    error.code = "P2002";
    throw error;
  }), { code: "P2002" });
  assert.equal(failedAttempts, 1);
});
