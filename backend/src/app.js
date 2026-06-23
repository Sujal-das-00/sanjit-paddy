const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const { env } = require('./config/env');
const { apiRouter } = require('./routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorMiddleware');

const FRONTEND_DIR = path.join(__dirname, '../../');

function createApp() {
  const app = express();

  app.use(cors({ origin: env.corsOrigin === '*' ? true : env.corsOrigin, credentials: true }));
  app.use(cookieParser());
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan('dev'));

  app.get('/health', (req, res) => {
    res.json({ ok: true, service: 'paddy-management-backend' });
  });

  app.use('/api', apiRouter);
  app.use(express.static(FRONTEND_DIR));
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
