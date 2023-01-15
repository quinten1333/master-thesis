import express from 'express';
import morgan from 'morgan';
import http from 'http';
import debugLib from 'debug';
const debug = debugLib('gateway:app');

const createApp = (port, io, openRequests) => {
  const app = express();
  app.set('port', port);
  app.disable('x-powered-by');

  app.use(morgan('dev'));

  if (process.env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', '*');
      res.setHeader('Access-Control-Allow-Headers', '*');
      res.setHeader('Access-Control-Max-Age', '86400');

      if (req.method === 'OPTIONS') { res.end(); return; }
      next();
    });
  }

  app.get('/', (req, res) => {
    const params = JSON.parse(req.query.params);
    const reqId = io.run(params);
    openRequests[reqId] = res;
  })

  // catch 404 and forward to error handler
  app.use((req, res, next) => {
    next({ status: 404 });
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

const createServer = (port, io) => {
  const openRequests = {};
  const app = createApp(port, io, openRequests);
  const server = http.createServer(app);
  server.on('error', console.error);
  server.on('listening', () => {
    debug(`Listening on ${port}`);
  });
  server.listen(port);

  return openRequests;
}
export default createServer;
