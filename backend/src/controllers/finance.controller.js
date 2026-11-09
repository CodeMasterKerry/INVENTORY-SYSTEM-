const prisma = require("../prisma");
const { asyncHandler, httpError } = require("../utils/helpers");
const { dateRangeWhere, integer, money, rejectUnknownFields, requiredString, requireObject } = require("../utils/validation");

const expenseFields = ["category", "description", "amount", "date"];
const expenseInclude = { createdBy: { select: { id: true, name: true } } };
const incomeInclude = {
  sale: {
    include: {
      items: true,
      createdBy: { select: { id: true, name: true } },
      approvedBy: { select: { id: true, name: true } },
    },
  },
};

function normalizeExpense(body) {
  rejectUnknownFields(body, expenseFields);
  const category = requiredString(body.category, "Category", { max: 80 });
  const description = requiredString(body.description, "Description", { max: 500 });
  const amount = money(body.amount, "Amount");
  if (amount <= 0) throw httpError(400, "Amount must be greater than zero");
  const date = requiredString(body.date, "Date", { max: 10 });
  const parsedDate = new Date(`${date}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) {
    throw httpError(400, "Date must be a valid calendar date");
  }
  return { category, description, amount, expenseDate: parsedDate };
}

exports.listIncome = asyncHandler(async (req, res) => {
  const income = await prisma.financialTransaction.findMany({
    where: { type: "INCOME", ...dateRangeWhere(req.query, "createdAt") },
    include: incomeInclude,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  res.json(income);
});

exports.listExpenses = asyncHandler(async (req, res) => {
  const expenses = await prisma.expense.findMany({
    where: dateRangeWhere(req.query, "expenseDate"),
    include: expenseInclude,
    orderBy: [{ expenseDate: "desc" }, { id: "desc" }],
  });
  res.json(expenses);
});

exports.createExpense = asyncHandler(async (req, res) => {
  const data = normalizeExpense(requireObject(req.body));
  const expense = await prisma.expense.create({
    data: { ...data, createdById: req.user.id },
    include: expenseInclude,
  });
  res.status(201).json(expense);
});

exports.updateExpense = asyncHandler(async (req, res) => {
  const id = integer(req.params.id, "Expense ID", { min: 1 });
  const data = normalizeExpense(requireObject(req.body));
  const result = await prisma.expense.updateMany({ where: { id }, data });
  if (result.count !== 1) throw httpError(404, "Expense not found");
  const expense = await prisma.expense.findUnique({ where: { id }, include: expenseInclude });
  res.json(expense);
});

exports.deleteExpense = asyncHandler(async (req, res) => {
  const id = integer(req.params.id, "Expense ID", { min: 1 });
  const result = await prisma.expense.deleteMany({ where: { id } });
  if (result.count !== 1) throw httpError(404, "Expense not found");
  res.status(204).end();
});
