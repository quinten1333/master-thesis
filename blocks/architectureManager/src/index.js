/**
 * Receive IO config from generator
 * - Check if services are running. If not update docker compose and rerun
 * - - Optimise architecture
 * - Broadcast new architecture
 */

import express from 'express';
import morgan from 'morgan';
import http from 'http';
import debugLib from 'debug';

import conn from './conn.js';
import routeApiArch from './api/architecture.js';

const debug = debugLib('architectureManager');

const createApp = (port) => {
  const app = express();
  app.set('port', port);
  app.disable('x-powered-by');

  app.use(morgan('dev'));
  app.use(express.json({ }));
  app.use(express.urlencoded({ extended: true }));

  if (process.env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', '*');
      res.setHeader('Access-Control-Allow-Headers', '*');
      res.setHeader('Access-Control-Max-Age', '86400');
      next();
    });
  }

  app.use('/api/architecture', routeApiArch);
  app.use(express.static('static'));

  // catch 404 and forward to error handler
  app.use((req, res, next) => {
    next({ message: 'Page not found', status: 404 });
  });

  // error handler
  app.use((err, req, res, next) => {
    const error = req.app.get('env') === 'development' ? err : {};

    let message;
    if (req.headers.accept === 'application/json') {
      message = JSON.stringify(error.message);
    } else {
      message = `${err.message}<br><br><code>${JSON.stringify(error)}</code>`
    }

    res.status(err.status || 500);
    res.send(message);
  });

  return app;
}

const initialize = async (port) => {
  await conn.connect();
  const server = http.createServer(createApp(port));

  server.on('error', console.error);
  server.on('listening', () => {
    debug(`Listening on ${port}`);
  });
  server.listen(port);

  return server;
}

initialize(process.env.PORT || 3000);
