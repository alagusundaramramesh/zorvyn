const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');
const { getDB } = require('../db/mongo');
const { USER_STATUS } = require('../config/constants');

module.exports = async function auth(req, res, next) {
    console.log('Authenticating request...', req);
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ status: 'error', message: 'Missing bearer token' });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const db = getDB();
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(payload.userId) },
      { projection: { passwordHash: 0 } }
    );

    if (!user) {
      return res.status(401).json({ status: 'error', message: 'Invalid token user' });
    }

    if (user.status !== USER_STATUS.ACTIVE) {
      return res.status(403).json({ status: 'error', message: 'User is inactive' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized access' });
  }
};
