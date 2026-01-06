const express = require('express');
const cors = require('cors');
const path = require('path');

const scrambleService = require('./services/scrambles');
const scramblesRoutes = require('./routes/scrambles');
const sessionsRoutes = require('./routes/sessions');
const attemptsRoutes = require('./routes/attempts');
const statsRoutes = require('./routes/stats');
const srsRoutes = require('./routes/srs');
const solvesRoutes = require('./routes/solves');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Load scrambles into memory on startup
console.log('Loading scrambles...');
scrambleService.loadScrambles();

// Routes
app.use('/api/scrambles', scramblesRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/attempts', attemptsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/srs', srsRoutes);
app.use('/api/solves', solvesRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static frontend in production
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, '../frontend/dist');
  app.use(express.static(frontendPath));

  // SPA fallback - serve index.html for non-API routes
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      message: `Route ${req.method} ${req.path} not found`,
      code: 'NOT_FOUND'
    }
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }
  });
});

module.exports = app;
