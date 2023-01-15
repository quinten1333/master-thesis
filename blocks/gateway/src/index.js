import MSAMessaging from '../../../libs/msamessaging/index.js';
import createServer from './app.js';

const servers = {};
const io = new MSAMessaging();
io.register('identity', (input) => input);


io.register('reply', (input, metadata, args) => {
  servers[args.port][metadata.reqId].json(input);
  delete servers[args.port][metadata.reqId];
});

io.register('listen', (input, metadata, args) => {
  const port = args.port;
  const openRequests = createServer(port, io);
  servers[port] = openRequests;
});

io.start();
