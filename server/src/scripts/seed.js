const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const { connectDB, closeDB } = require('../db/mongo');
const { ROLES, USER_STATUS } = require('../config/constants');

dotenv.config();

async function upsertUser(db, user) {
  const passwordHash = await bcrypt.hash(user.password, 10);
  const now = new Date();
  await db.collection('users').updateOne(
    { email: user.email },
    {
      $set: {
        name: user.name,
        email: user.email,
        passwordHash,
        role: user.role,
        status: USER_STATUS.ACTIVE,
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true }
  );
}

async function seed() {
  const db = await connectDB();

  await upsertUser(db, {
    name: 'Admin User',
    email: 'admin@finance.local',
    password: 'Admin@123',
    role: ROLES.ADMIN,
  });

  await upsertUser(db, {
    name: 'Analyst User',
    email: 'analyst@finance.local',
    password: 'Analyst@123',
    role: ROLES.ANALYST,
  });

  await upsertUser(db, {
    name: 'Viewer User',
    email: 'viewer@finance.local',
    password: 'Viewer@123',
    role: ROLES.VIEWER,
  });

  console.log('Seed completed: admin/analyst/viewer users created or updated.');
}

seed()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await closeDB();
  });
