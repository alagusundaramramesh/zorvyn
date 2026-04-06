const express = require('express');
const asyncHandler = require('../utils/async-handler');
const { getDB } = require('../db/mongo');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { ROLES, RECORD_TYPES } = require('../config/constants');
const { parseDate } = require('../utils/validation');

const router = express.Router();

function dateMatchFromQuery(query) {
  const match = { deleted: { $ne: true } };

  if (query.startDate || query.endDate) {
    match.date = {};
    if (query.startDate) {
      match.date.$gte = parseDate(query.startDate, 'startDate');
    }
    if (query.endDate) {
      match.date.$lte = parseDate(query.endDate, 'endDate');
    }
  }

  return match;
}

router.use(auth, authorize(ROLES.ADMIN, ROLES.ANALYST, ROLES.VIEWER));

router.get('/summary', asyncHandler(async (req, res) => {
  const db = getDB();
  const match = dateMatchFromQuery(req.query);

  const [summary] = await db.collection('financial_records').aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalIncome: {
          $sum: {
            $cond: [{ $eq: ['$type', RECORD_TYPES.INCOME] }, '$amount', 0],
          },
        },
        totalExpenses: {
          $sum: {
            $cond: [{ $eq: ['$type', RECORD_TYPES.EXPENSE] }, '$amount', 0],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        totalIncome: 1,
        totalExpenses: 1,
        netBalance: { $subtract: ['$totalIncome', '$totalExpenses'] },
      },
    },
  ]).toArray();

  const data = summary || { totalIncome: 0, totalExpenses: 0, netBalance: 0 };
  return res.status(200).json({ status: 'success', data });
}));

router.get('/category-breakdown', asyncHandler(async (req, res) => {
  const db = getDB();
  const match = dateMatchFromQuery(req.query);

  const data = await db.collection('financial_records').aggregate([
    { $match: match },
    {
      $group: {
        _id: { category: '$category', type: '$type' },
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        category: '$_id.category',
        type: '$_id.type',
        total: 1,
        count: 1,
      },
    },
    { $sort: { total: -1 } },
  ]).toArray();

  return res.status(200).json({ status: 'success', data });
}));

router.get('/recent-activity', asyncHandler(async (req, res) => {
  const db = getDB();
  const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit || '10', 10)));

  const data = await db.collection('financial_records')
    .find({ deleted: { $ne: true } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  return res.status(200).json({ status: 'success', data });
}));

router.get('/trends', asyncHandler(async (req, res) => {
  const db = getDB();
  const match = dateMatchFromQuery(req.query);
  const period = (req.query.period || 'monthly').toLowerCase();

  let pipeline;
  if (period === 'weekly') {
    pipeline = [
      { $match: match },
      {
        $group: {
          _id: {
            year: { $isoWeekYear: '$date' },
            week: { $isoWeek: '$date' },
            type: '$type',
          },
          total: { $sum: '$amount' },
        },
      },
      {
        $project: {
          _id: 0,
          period: {
            $concat: [
              { $toString: '$_id.year' },
              '-W',
              { $toString: '$_id.week' },
            ],
          },
          type: '$_id.type',
          total: 1,
        },
      },
      { $sort: { period: 1 } },
    ];
  } else {
    pipeline = [
      { $match: match },
      {
        $group: {
          _id: {
            month: { $dateToString: { format: '%Y-%m', date: '$date' } },
            type: '$type',
          },
          total: { $sum: '$amount' },
        },
      },
      {
        $project: {
          _id: 0,
          period: '$_id.month',
          type: '$_id.type',
          total: 1,
        },
      },
      { $sort: { period: 1 } },
    ];
  }

  const data = await db.collection('financial_records').aggregate(pipeline).toArray();
  return res.status(200).json({ status: 'success', data, meta: { period } });
}));

module.exports = router;
