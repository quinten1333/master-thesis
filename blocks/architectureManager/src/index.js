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

import yaml from 'js-yaml';

import AMQPConn from '@amicopo/msamessaging/messaging.js';
import Architecture from './architecture.js';

const debug = debugLib('architectureManager');

const config = JSON.parse(process.env.IOConfig);
const conn = new AMQPConn(config.endpoint);

let archId = -1;
const architectures = {
  [-1]: new Architecture(conn, -1, 'Testing', {}, yaml.load(`- steps:\n  - block: gateway\n    fn: listen\n    extraArgs:\n    - port: 3000\n      routes:\n      - method: get\n        path: /\n        params:\n          params:\n            type: number\n  - block: util\n    fn: unpack\n    extraArgs:\n    - params\n  - block: util\n    fn: plus\n    extraArgs:\n    - 2\n  - block: util\n    fn: min\n    extraArgs:\n    - 10\n  - block: gateway\n    fn: reply\n    extraArgs:\n    - port: 3000\n- steps:\n  - block: gateway\n    fn: listen\n    extraArgs:\n    - port: 3000\n      routes:\n      - method: get\n        path: /identity\n        params:\n          params:\n            type: number\n  - block: util\n    fn: unpack\n    extraArgs:\n    - params\n  - block: gateway\n    fn: reply\n    extraArgs:\n    - port: 3000\n`), 'amqp://rabbitmq'),
  [-2]: new Architecture(conn, -2, 'Testing mul, div, plus, min', {}, yaml.load(`- steps:\n  - block: gateway # The first step is special.\n    fn: listen     # it is called directly at the start of IO.\n    extraArgs:\n    - port: 3000 # Start a web server on port 3000\n      routes:\n      - method: get\n        path: /all\n        params:\n          params:\n            type: number\n  - block: util\n    fn: unpack\n    extraArgs:\n    - params\n  - block: util # Name of the service\n    fn: mul # function that is registered that is called\n    extraArgs:\n    - 30\n  - block: util\n    fn: div\n    extraArgs:\n    - 30\n  - block: util\n    fn: plus\n    extraArgs:\n    - 5\n  - block: util\n    fn: min\n    extraArgs:\n    - 5\n  - block: gateway\n    fn: reply\n    extraArgs:\n    - port: 3000 # Send back a reply using the webserver on this port`), 'amqp://rabbitmq'),
};

const createApp = (port) => {
  const app = express();
  app.set('port', port);
  app.disable('x-powered-by');

  app.use(morgan('dev'));
  app.use(express.json({ }));
  app.use(express.urlencoded({ extended: true }));
  // app.use(express.static('src/static'));

  app.set('view engine', 'pug')
  app.set('views', 'src/views')

  app.get('/', (req, res) => { res.render('index', { architectures }); });
  app.get('/architecture/:archId/active', async (req, res, next) => {
    const { archId } = req.params;
    const { active } = req.query;
    if (!archId) { res.status(400).send('No archId provided!'); return; }
    try {
      if (active === 'true') {
        await architectures[archId].create();
      } else {
        await architectures[archId].delete();
      }
    } catch (error) {
      next(error);
      return;
    }

    res.redirect('/');
  });

  app.get('/architecture/:archId/io', (req, res) => {
    const { archId } = req.params;
    if (!archId) { res.status(400).send('No archId provided!'); return; }

    res.render('architecture-io', { arch: architectures[archId], io: JSON.stringify(architectures[archId].IOConfig, null, 2) })
  })

  app.post('/architecture', (req, res) => {
    const arch = yaml.load(req.body.yaml);
    const newId = ++archId;
    architectures[archId] = new Architecture(conn, newId, arch.name, arch.datasets, arch.pipelines, arch.endpoint);

    res.redirect('/');
  });

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
