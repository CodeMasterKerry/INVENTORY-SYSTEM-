// Wraps async functions so errors go to the error handler automatically
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Create an error with an HTTP status code
const httpError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

// Invoice number like INV-20261031-4821
const makeInvoiceNo = () => {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const r = Math.floor(1000 + Math.random() * 9000);
  return `INV-${d}-${r}`;
};

module.exports = { asyncHandler, httpError, makeInvoiceNo };