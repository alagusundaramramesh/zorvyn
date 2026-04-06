const express = require('express');
const asyncHandler = require('../utils/async-handler');
const ApiError = require('../utils/api-error');
const { getDB } = require('../db/mongo');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { ROLES, RECORD_TYPES } = require('../config/constants');
const {
  requiredString,
  optionalString,
  parseAmount,
  parseDate,
  parsePagination,
  toObjectId,
} = require('../utils/validation');

const router = express.Router();
const ALLOWED_TYPES = Object.values(RECORD_TYPES);

function buildFilter(query) {
  const filter = { deleted: { $ne: true } };

  if (query.type) {
    if (!ALLOWED_TYPES.includes(query.type)) {
      throw new ApiError(400, 'Invalid type filter');
    }
    filter.type = query.type;
  }

  if (query.category) {
    filter.category = query.category.trim();
  }

  if (query.startDate || query.endDate) {
    filter.date = {};
    if (query.startDate) {
      filter.date.$gte = parseDate(query.startDate, 'startDate');
    }
    if (query.endDate) {
      filter.date.$lte = parseDate(query.endDate, 'endDate');
    }
  }

  if (query.search) {
    filter.$or = [
      { category: { $regex: query.search, $options: 'i' } },
      { notes: { $regex: query.search, $options: 'i' } },
    ];
  }

  return filter;
}

router.use(auth);

router.post('/', authorize(ROLES.ADMIN), asyncHandler(async (req, res) => {
  const amount = parseAmount(req.body.amount);
  const type = requiredString(req.body.type, 'type').toLowerCase();
  const category = requiredString(req.body.category, 'category');
  const date = parseDate(req.body.date, 'date');
  const notes = optionalString(req.body.notes) || '';

  if (!ALLOWED_TYPES.includes(type)) {
    throw new ApiError(400, 'type must be income or expense');
  }

  const db = getDB();
  const now = new Date();
  const payload = {
    amount,
    type,
    category,
    date,
    notes,
    createdBy: req.user._id,
    deleted: false,
    createdAt: now,
    updatedAt: now,
  };

  const result = await db.collection('financial_records').insertOne(payload);
  return res.status(201).json({
    status: 'success',
    message: 'Record created',
    data: { _id: result.insertedId, ...payload },
  });
}));

router.get('/', authorize(ROLES.ADMIN, ROLES.ANALYST, ROLES.VIEWER), asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const db = getDB();
  const filter = buildFilter(req.query);

  const [records, total] = await Promise.all([
    db.collection('financial_records')
      .find(filter)
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    db.collection('financial_records').countDocuments(filter),
  ]);

  return res.status(200).json({
    status: 'success',
    data: records,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}));

router.get('/:id', authorize(ROLES.ADMIN, ROLES.ANALYST, ROLES.VIEWER), asyncHandler(async (req, res) => {
  const db = getDB();
  const recordId = toObjectId(req.params.id, 'recordId');

  const record = await db.collection('financial_records').findOne({ _id: recordId, deleted: { $ne: true } });
  if (!record) {
    throw new ApiError(404, 'Record not found');
  }

  return res.status(200).json({ status: 'success', data: record });
}));

router.patch('/:id', authorize(ROLES.ADMIN), asyncHandler(async (req, res) => {
  const db = getDB();
  const recordId = toObjectId(req.params.id, 'recordId');

  const update = {};
  if (req.body.amount !== undefined) {
    update.amount = parseAmount(req.body.amount);
  }
  if (req.body.type !== undefined) {
    const type = requiredString(req.body.type, 'type').toLowerCase();
    if (!ALLOWED_TYPES.includes(type)) {
      throw new ApiError(400, 'type must be income or expense');
    }
    update.type = type;
  }
  if (req.body.category !== undefined) {
    update.category = requiredString(req.body.category, 'category');
  }
  if (req.body.date !== undefined) {
    update.date = parseDate(req.body.date, 'date');
  }
  if (req.body.notes !== undefined) {
    update.notes = optionalString(req.body.notes) || '';
  }

  if (Object.keys(update).length === 0) {
    throw new ApiError(400, 'No valid fields provided for update');
  }

  update.updatedAt = new Date();

  const result = await db.collection('financial_records').findOneAndUpdate(
    { _id: recordId, deleted: { $ne: true } },
    { $set: update },
    { returnDocument: 'after' }
  );

  if (!result) {
    throw new ApiError(404, 'Record not found');
  }

  return res.status(200).json({
    status: 'success',
    message: 'Record updated',
    data: result,
  });
}));

router.delete('/:id', authorize(ROLES.ADMIN), asyncHandler(async (req, res) => {
  const db = getDB();
  const recordId = toObjectId(req.params.id, 'recordId');

  const result = await db.collection('financial_records').findOneAndUpdate(
    { _id: recordId, deleted: { $ne: true } },
    {
      $set: {
        deleted: true,
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
    },
    { returnDocument: 'after' }
  );

  if (!result) {
    throw new ApiError(404, 'Record not found');
  }

  return res.status(200).json({
    status: 'success',
    message: 'Record deleted',
    data: { _id: recordId },
  });
}));

module.exports = router;
