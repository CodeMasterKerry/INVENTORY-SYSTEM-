const { httpError } = require("./helpers");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MONEY_PATTERN = /^\d+(?:\.\d{1,2})?$/;

function requireObject(value, label = "Request body") {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw httpError(400, `${label} must be an object`);
  }
  return value;
}

function requiredString(value, field, { max = 200, lowercase = false } = {}) {
  if (typeof value !== "string") throw httpError(400, `${field} must be a string`);
  const result = value.trim();
  if (!result) throw httpError(400, `${field} is required`);
  if (result.length > max) throw httpError(400, `${field} must be ${max} characters or fewer`);
  return lowercase ? result.toLowerCase() : result;
}

function optionalString(value, field, { max = 500 } = {}) {
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw httpError(400, `${field} must be a string`);
  const result = value.trim();
  if (result.length > max) throw httpError(400, `${field} must be ${max} characters or fewer`);
  return result;
}

function emailAddress(value) {
  const email = requiredString(value, "Email", { max: 254, lowercase: true });
  if (!EMAIL_PATTERN.test(email)) throw httpError(400, "Email must be valid");
  return email;
}

function integer(value, field, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const validType = typeof value === "number" || (typeof value === "string" && /^\d+$/.test(value));
  const parsed = typeof value === "number" ? value : Number(value);
  if (!validType || !Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    throw httpError(400, `${field} must be a whole number from ${min} to ${max}`);
  }
  return parsed;
}

function money(value, field) {
  const text = typeof value === "number" ? String(value) : value;
  if (typeof text !== "string" || !MONEY_PATTERN.test(text)) {
    throw httpError(400, `${field} must be a non-negative amount with at most 2 decimal places`);
  }
  const parsed = Number(text);
  if (!Number.isFinite(parsed) || parsed > 99999999.99) {
    throw httpError(400, `${field} exceeds the supported amount`);
  }
  return Math.round(parsed * 100) / 100;
}

function enumValue(value, field, allowed) {
  if (typeof value !== "string" || !allowed.includes(value)) {
    throw httpError(400, `${field} must be one of: ${allowed.join(", ")}`);
  }
  return value;
}

function dateRange(query) {
  const range = {};
  for (const [parameter, operator] of [["from", "gte"], ["to", "lte"]]) {
    const value = query[parameter];
    if (value === undefined) continue;
    if (typeof value !== "string" || value.length > 64 || !Number.isFinite(Date.parse(value))) {
      throw httpError(400, `${parameter === "from" ? "From" : "To"} must be a valid date`);
    }
    range[operator] = new Date(value);
  }
  if (range.gte && range.lte && range.gte > range.lte) {
    throw httpError(400, "From must be earlier than or equal to To");
  }
  return range;
}

function dateRangeWhere(query, dateField, fallbackStatus) {
  const dates = dateRange(query);
  if (!Object.keys(dates).length) return {};
  if (!fallbackStatus) return { [dateField]: dates };

  return {
    OR: [
      { [dateField]: dates },
      { [dateField]: null, status: fallbackStatus, createdAt: dates },
    ],
  };
}

function rejectUnknownFields(body, allowed) {
  const unknown = Object.keys(body).filter((key) => !allowed.includes(key));
  if (unknown.length) throw httpError(400, `Unsupported field: ${unknown[0]}`);
}

module.exports = {
  emailAddress,
  enumValue,
  dateRange,
  dateRangeWhere,
  integer,
  money,
  optionalString,
  rejectUnknownFields,
  requiredString,
  requireObject,
};
