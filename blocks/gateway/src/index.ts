import Pipelinemessaging, { mergeOptions } from '@amicopo/pipelinemessaging';
import Server, { Route } from './app.js';

const servers: {[port: number]: Server} = {};
const io = new Pipelinemessaging();
io.register('identity', (input: any) => input);


io.register('reply', ({ reqId, input }, args: { port: number, status: number }) => {
  if (!input.body) { input = { body: input } }
  const options: { body: string, status: number, port: number } = mergeOptions(input, args);

  servers[options.port].respond(reqId, options.body, options.status || 200);
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
