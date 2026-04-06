const express = require('express');
const bcrypt = require('bcrypt');
const asyncHandler = require('../utils/async-handler');
const ApiError = require('../utils/api-error');
const { getDB } = require('../db/mongo');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { ROLES, USER_STATUS } = require('../config/constants');
const { requiredString, parsePagination, toObjectId } = require('../utils/validation');

const router = express.Router();
const ALLOWED_ROLES = Object.values(ROLES);
const ALLOWED_STATUS = Object.values(USER_STATUS);

router.use(auth, authorize(ROLES.ADMIN));

router.post('/', asyncHandler(async (req, res) => {
  const name = requiredString(req.body.name, 'name');
  const email = requiredString(req.body.email, 'email').toLowerCase();
  const password = requiredString(req.body.password, 'password');
  const role = req.body.role || ROLES.VIEWER;
  const status = req.body.status || USER_STATUS.ACTIVE;

  if (!ALLOWED_ROLES.includes(role)) {
    throw new ApiError(400, 'Invalid role');
  }

  if (!ALLOWED_STATUS.includes(status)) {
    throw new ApiError(400, 'Invalid status');
  }

  const db = getDB();
  const existing = await db.collection('users').findOne({ email });
  if (existing) {
    throw new ApiError(409, 'Email already exists');
  }

  const now = new Date();
  const passwordHash = await bcrypt.hash(password, 10);
  const result = await db.collection('users').insertOne({
    name,
    email,
    passwordHash,
    role,
    status,
    createdAt: now,
    updatedAt: now,
  });

  return res.status(201).json({
    status: 'success',
    message: 'User created',
    data: {
      _id: result.insertedId,
      name,
      email,
      role,
      status,
    },
  });
}));

router.get('/', asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const db = getDB();

  const filter = {};
  if (req.query.role) {
    filter.role = req.query.role;
  }
  if (req.query.status) {
    filter.status = req.query.status;
  }

  const [users, total] = await Promise.all([
    db.collection('users')
      .find(filter, { projection: { passwordHash: 0 } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    db.collection('users').countDocuments(filter),
  ]);

  return res.status(200).json({
    status: 'success',
    data: users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}));

router.patch('/:id', asyncHandler(async (req, res) => {
  const userId = toObjectId(req.params.id, 'userId');
  const db = getDB();

  const update = {};
  if (req.body.name !== undefined) {
    update.name = requiredString(req.body.name, 'name');
  }
  if (req.body.email !== undefined) {
    update.email = requiredString(req.body.email, 'email').toLowerCase();
  }
  if (req.body.password !== undefined) {
    update.passwordHash = await bcrypt.hash(requiredString(req.body.password, 'password'), 10);
  }
  if (req.body.role !== undefined) {
    if (!ALLOWED_ROLES.includes(req.body.role)) {
      throw new ApiError(400, 'Invalid role');
    }
    update.role = req.body.role;
  }
  if (req.body.status !== undefined) {
    if (!ALLOWED_STATUS.includes(req.body.status)) {
      throw new ApiError(400, 'Invalid status');
    }
    update.status = req.body.status;
  }

  if (Object.keys(update).length === 0) {
    throw new ApiError(400, 'No valid fields provided for update');
  }

  update.updatedAt = new Date();

  const result = await db.collection('users').findOneAndUpdate(
    { _id: userId },
    { $set: update },
    {
      returnDocument: 'after',
      projection: { passwordHash: 0 },
    }
  );

  if (!result) {
    throw new ApiError(404, 'User not found');
  }

  return res.status(200).json({
    status: 'success',
    message: 'User updated',
    data: result,
  });
}));

router.patch('/:id/status', asyncHandler(async (req, res) => {
  const userId = toObjectId(req.params.id, 'userId');
  const status = requiredString(req.body.status, 'status');
  if (!ALLOWED_STATUS.includes(status)) {
    throw new ApiError(400, 'Invalid status');
  }

  const db = getDB();
  const result = await db.collection('users').findOneAndUpdate(
    { _id: userId },
    { $set: { status, updatedAt: new Date() } },
    { returnDocument: 'after', projection: { passwordHash: 0 } }
  );

  if (!result) {
    throw new ApiError(404, 'User not found');
  }

  return res.status(200).json({ status: 'success', message: 'Status updated', data: result });
}));

router.patch('/:id/role', asyncHandler(async (req, res) => {
  const userId = toObjectId(req.params.id, 'userId');
  const role = requiredString(req.body.role, 'role');

  if (!ALLOWED_ROLES.includes(role)) {
    throw new ApiError(400, 'Invalid role');
  }

  const db = getDB();
  const result = await db.collection('users').findOneAndUpdate(
    { _id: userId },
    { $set: { role, updatedAt: new Date() } },
    { returnDocument: 'after', projection: { passwordHash: 0 } }
  );

  if (!result) {
    throw new ApiError(404, 'User not found');
  }

  return res.status(200).json({ status: 'success', message: 'Role updated', data: result });
}));

module.exports = router;
