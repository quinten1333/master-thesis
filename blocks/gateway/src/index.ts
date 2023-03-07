import MSAMessaging from '@amicopo/msamessaging';
import Server, { Route } from './app.js';

const servers: {[port: number]: Server} = {};
const io = new MSAMessaging();
io.register('identity', (input: any) => input);


io.register('reply', ({ reqId, input }, args: { port: number }) => {
  servers[args.port].respond(reqId, input);
});

io.register('listen', ({ pipeline, start }, args: { port: number, routes: Route[] }) => {
  const { port, routes } = args;

  if (start) {
    if (!(port in servers)) {
      servers[port] = new Server(port);
    }
    servers[port].loadRoutes(pipeline, routes);
  } else {
    servers[port].unloadPipeline(pipeline);
    if (!servers[port].hasRoutes()) {
      servers[port].close();
      delete servers[port];
    }
  }
});

io.start();
