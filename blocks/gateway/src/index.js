import MSAMessaging from '../../../libs/msamessaging/index.js';
import createServer from './app.js';

const servers = {};
const io = new MSAMessaging();
io.register('identity', (input) => input);


io.register('reply', ({ reqId, input }, args) => {
  servers[args.port].requests[reqId].json(input);
  delete servers[args.port].requests[reqId];
});

io.register('listen', ({ arch, start }, args) => {
  const port = args.port;
  if (start) {
    servers[port] = createServer(port, arch);
  } else {
    servers[port].close();
  }
});

io.start();
