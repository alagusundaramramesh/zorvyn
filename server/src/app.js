const express = require('express');
const authRoutes = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');
const recordsRoutes = require('./routes/records.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const errorHandler = require('./middleware/error-handler');

const app = express();

app.use(express.json({ limit: '1mb' }));


app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Finance backend is running',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/records', recordsRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use((req, res) => {
  res.status(404).json({ status: 'error', message: 'Route not found' });
});

app.use(errorHandler);

module.exports = app;
