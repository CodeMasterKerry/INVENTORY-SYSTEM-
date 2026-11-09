const crypto = require("node:crypto");

// Wraps async functions so errors go to the error handler automatically
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Create an error with an HTTP status code
const httpError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

const makeInvoiceNo = () => {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const r = crypto.randomBytes(5).toString("hex").toUpperCase();
  return `INV-${d}-${r}`;
};

async function withSerializationRetry(operation, retries = 3) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (error.code !== "P2034" || attempt >= retries) throw error;
    }
  }
}

module.exports = { asyncHandler, httpError, makeInvoiceNo, withSerializationRetry };