const { ObjectId } = require('mongodb');
const ApiError = require('./api-error');

function requiredString(value, fieldName) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ApiError(400, `${fieldName} is required`);
  }
  return value.trim();
}

function optionalString(value) {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new ApiError(400, 'Invalid string field');
  }
  return value.trim();
}

function parseAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ApiError(400, 'Amount must be a positive number');
  }
  return amount;
}

function parseDate(value, fieldName = 'date') {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(400, `Invalid ${fieldName}`);
  }
  return date;
}

function parsePagination(query) {
  const page = Math.max(1, Number.parseInt(query.page || '1', 10));
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit || '10', 10)));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

function toObjectId(id, fieldName = 'id') {
  if (!ObjectId.isValid(id)) {
    throw new ApiError(400, `Invalid ${fieldName}`);
  }
  return new ObjectId(id);
}

module.exports = {
  requiredString,
  optionalString,
  parseAmount,
  parseDate,
  parsePagination,
  toObjectId,
};
