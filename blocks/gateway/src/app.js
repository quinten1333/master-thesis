import express from 'express';
import morgan from 'morgan';
import MSAMessaging from '../../../libs/msamessaging/index.js';

export const io = new MSAMessaging();
io.register('identity', (input) => input);

const queueId = parseInt(process.env.QUEUE_ID);
const queueName = process.env.QUEUE_NAME;

const openRequests = {};
io.register('reply', (input, metadata) => {
  openRequests[metadata.reqId].json(input);
  delete openRequests[metadata.reqId];
});

const app = express();
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
  const reqId = io.run(queueId, queueName, params);
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

export default app;
