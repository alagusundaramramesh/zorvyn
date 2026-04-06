const express = require('express');
const bcrypt = require('bcrypt');
const asyncHandler = require('../utils/async-handler');
const ApiError = require('../utils/api-error');
const { getDB } = require('../db/mongo');
const auth = require('../middleware/auth');
const { signToken } = require('../utils/jwt');
const { ROLES, USER_STATUS } = require('../config/constants');
const { requiredString } = require('../utils/validation');
const e = require('express');

const router = express.Router();

router.post('/setup-admin', asyncHandler(async (req, res) => {
  console.log('Setting up initial admin user...',req.method, req.originalUrl);
  const providedKey = req.headers['x-setup-key'] || req.body.setupKey;
  if (!providedKey || providedKey !== process.env.ADMIN_SETUP_KEY) {
    throw new ApiError(403, 'Invalid setup key');
  }

  const name = requiredString(req.body.name, 'name');
  const email = requiredString(req.body.email, 'email').toLowerCase();
  const password = requiredString(req.body.password, 'password');

  const db = getDB();
  const usersCount = await db.collection('users').findOne({ name: 'admin' ,email: email });
  if (usersCount) {
    throw new ApiError(409, 'Initial admin already configured');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const now = new Date();

  const result = await db.collection('users').insertOne({
    name,
    email,
    passwordHash,
    role: ROLES.ADMIN,
    status: USER_STATUS.ACTIVE,
    createdAt: now,
    updatedAt: now,
  });

  const user = {
    _id: result.insertedId,
    name,
    email,
    role: ROLES.ADMIN,
    status: USER_STATUS.ACTIVE,
  };

  const token = signToken(user);
  return res.status(201).json({
    status: 'success',
    message: 'Initial admin created',
    data: { token, user },
  });
}));

router.post('/login', asyncHandler(async (req, res) => {
  const email = requiredString(req.body.email, 'email').toLowerCase();
  const password = requiredString(req.body.password, 'password');

  const db = getDB();
  const user = await db.collection('users').findOne({ email });
  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid email or password');
  }

  if (user.status !== USER_STATUS.ACTIVE) {
    throw new ApiError(403, 'User is inactive');
  }

  const token = signToken(user);
  return res.status(200).json({
    status: 'success',
    message: 'Login successful',
    data: {
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    },
  });
}));

router.get('/me', auth, asyncHandler(async (req, res) => {
  return res.status(200).json({
    status: 'success',
    data: {
      user: req.user,
    },
  });
}));

module.exports = router;
