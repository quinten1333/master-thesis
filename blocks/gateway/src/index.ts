import MSAMessaging from '../../../libs/msamessaging/index.js';
import Server, { Route } from './app.js';

const servers: {[port: number]: Server} = {};
const io = new MSAMessaging();
io.register('identity', (input: any) => input);


io.register('reply', ({ reqId, input }, args: { port: number }) => {
  servers[args.port].respond(reqId, input);
});

io.register('listen', ({ arch, start }, args: { port: number, routes: Route[] }) => {
  const { port, routes } = args;
  routes.forEach((route) => { route.arch = arch });

  if (start) {
    if (port in servers) {
      servers[port].loadRoutes(routes);
    } else {
      servers[port] = new Server(port, routes);
    }
  } else {
    servers[port].close();
    delete servers[port];
  }
});

io.start();
