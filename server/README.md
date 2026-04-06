# Finance Data Processing and Access Control Backend

Backend assignment implementation for a finance dashboard system with:
- Role-based access control (`viewer`, `analyst`, `admin`)
- Financial records CRUD with filters
- Dashboard summary and analytics APIs
- Input validation and consistent error handling
- MongoDB persistence

## Tech Stack
- Node.js
- Express.js
- MongoDB (`mongodb` driver)
- JWT (`jsonwebtoken`)
- Password hashing (`bcrypt`)

## Project Structure
```
finance-assignment/
  src/
    app.js
    server.js
    config/constants.js
    db/mongo.js
    middleware/
    routes/
    scripts/seed.js
    utils/
  .env.example
  package.json
```

## Setup
1. Go to project folder:
```bash
cd /home/anand/var/finance-assignment
```

2. Create env file:
```bash
cp .env.example .env
```

3. Install dependencies:
```bash
npm install
```

4. Start server:
```bash
npm start
```

Server runs on `http://localhost:4000` by default.

## Environment Variables
- `PORT`: server port
- `MONGODB_URI`: Mongo connection string
- `DB_NAME`: database name
- `JWT_SECRET`: token signing secret
- `JWT_EXPIRES_IN`: token expiry (default `1d`)
- `ADMIN_SETUP_KEY`: one-time initial admin setup key

## Access Control Model
- `viewer`
  - Can read records
  - Can access dashboard summaries
  - Cannot create/update/delete records
  - Cannot manage users
- `analyst`
  - Can read records
  - Can access dashboard summaries
  - Cannot create/update/delete records
  - Cannot manage users
- `admin`
  - Full access to records
  - Full access to user management
  - Can access dashboard summaries

## API Overview

### Health
- `GET /health`

### Auth
- `POST /api/auth/setup-admin`
  - Header: `x-setup-key: <ADMIN_SETUP_KEY>`
  - Creates initial admin only when user collection is empty
- `POST /api/auth/login`
- `GET /api/auth/me` (auth required)

### Users (Admin Only)
- `POST /api/users`
- `GET /api/users?role=&status=&page=&limit=`
- `PATCH /api/users/:id`
- `PATCH /api/users/:id/status`
- `PATCH /api/users/:id/role`

### Financial Records
- `POST /api/records` (admin)
- `GET /api/records` (viewer/analyst/admin)
  - Filters: `type`, `category`, `startDate`, `endDate`, `search`, `page`, `limit`
- `GET /api/records/:id` (viewer/analyst/admin)
- `PATCH /api/records/:id` (admin)
- `DELETE /api/records/:id` (admin, soft delete)

### Dashboard
- `GET /api/dashboard/summary`
  - Returns `totalIncome`, `totalExpenses`, `netBalance`
- `GET /api/dashboard/category-breakdown`
- `GET /api/dashboard/recent-activity?limit=10`
- `GET /api/dashboard/trends?period=monthly|weekly`

All dashboard endpoints support optional `startDate` and `endDate` where applicable.

## Postman Collection
- Import: `postman/Finance-Assignment.postman_collection.json`
- Set collection variables: `baseUrl`, `setupKey` (your `ADMIN_SETUP_KEY`)

## Sample Flow
1. Setup admin:
```bash
curl -X POST http://localhost:4000/api/auth/setup-admin \
  -H "Content-Type: application/json" \
  -H "x-setup-key: your_setup_key" \
  -d '{"name":"Admin","email":"admin@example.com","password":"Admin@123"}'
```

2. Login:
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin@123"}'
```

3. Create record (admin token required):
```bash
curl -X POST http://localhost:4000/api/records \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"amount":5000,"type":"income","category":"salary","date":"2026-04-06","notes":"monthly salary"}'
```

## Seed Script (Optional)
Creates demo users:
- `admin@finance.local / Admin@123`
- `analyst@finance.local / Analyst@123`
- `viewer@finance.local / Viewer@123`

Run:
```bash
npm run seed
```

## Validation and Error Handling
- Required field checks for all core payloads
- Role/status/type constraints enforced
- Safe ObjectId parsing
- Meaningful HTTP status codes (`400`, `401`, `403`, `404`, `409`, `500`)

## Assumptions and Tradeoffs
- Authentication is JWT-based for simplicity.
- Soft delete is used for records instead of permanent delete.
- Only `admin` can mutate data/users to keep authorization explicit.
- No refresh token flow added (out of scope for assignment).
- Unit tests are not included in this submission due timeline focus on backend functionality and clarity.
