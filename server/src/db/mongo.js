const { MongoClient } = require('mongodb');

let client;
let db;

async function connectDB() {
  if (db) {
    return db;
  }

  const uri = process.env.MONGODB_URI;
  const dbName = process.env.DB_NAME || 'finance_assignment';

  if (!uri) {
    throw new Error('MONGODB_URI is required in environment variables');
  }

  client = new MongoClient(uri, { maxPoolSize: 10 });
  await client.connect();
  db = client.db(dbName);

  await Promise.all([
    db.collection('users').createIndex({ email: 1 }),
    // db.collection('users').createIndex({ role: 1, status: 1 }),
    // db.collection('financial_records').createIndex({ date: -1 }),
    // db.collection('financial_records').createIndex({ type: 1, category: 1 }),
    // db.collection('financial_records').createIndex({ createdBy: 1 }),
    // db.collection('financial_records').createIndex({ deleted: 1 }),
  ]);

  return db;
}

function getDB() {
  if (!db) {
    throw new Error('Database not initialized. Call connectDB() first.');
  }
  return db;
}

async function closeDB() {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}

module.exports = {
  connectDB,
  getDB,
  closeDB,
};
