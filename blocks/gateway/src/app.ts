import express, { Express, Request, Response } from 'express';
import morgan from 'morgan';
import http from 'node:http';
import debugLib from 'debug';
const debug = debugLib('gateway:app');

type Architecture = any;

export type Route = {
  method?: string
  path: string
  params: { [name: string]: { type: string } }
  arch: Architecture
};

// type Condition = {
//   parameter: string
//   condition: string
//   value: any
// };

type CompiledRoutes = {
  [method: string]: {
    [path: string]: {
      params: { [name: string]: { type: string } }
      arch: Architecture
    }
  }
};

class Server {
  port: number
  private app: Express
  private server: http.Server
  private openRequests: { [id: number]: Response }

  private routes: CompiledRoutes

  constructor(port: number, routes: Route[]) {
    this.port = port;
    this.openRequests = {};

    this.loadRoutes(routes);
    this.createApp();
    this.createServer();
  }

  public loadRoutes = (routes: Route[]) => {
    const compiledRoutes: CompiledRoutes = {};
    for (const route of routes) {
      const method = route.method || 'get';
      if (!(method in compiledRoutes)) {
        compiledRoutes[method] = {};
      }

      compiledRoutes[method][route.path] = {
        params: route.params,
        arch: route.arch,
      }
    }

    this.routes = compiledRoutes;
  };

  private parseValue = (type: string, value: any) => {
    switch (type) {
      case 'string':
        return value;

      case 'integer':
          return parseInt(value);

      case 'number':
      case 'float':
        return parseFloat(value);

      default:
        throw new Error(`Unkown type ${type}`);
    }
  }

  private resolveRoutes = (req: Request, res: Response, next: Function) => {
    res.header('Connection', 'close'); // So the server shutsdown immediately

    const routes = this.routes[req.method];
    if (!routes) { next(); return; }
    const route = routes[req.path]
    if (!route) { next(); return; }

    const params = {};
    for (const param in route.params) {
      if (!(param in req.params)) { next(); return; }
      const paramConf = route.params[param];

      params[param] = this.parseValue(paramConf.type, req.params.param);
      if (!params[param]) { next(); return; }
    }

    const reqId = route.arch.run(params);
    this.openRequests[reqId] = res;
  }

  private createApp() {
    this.app = express();
    this.app.set('port', this.port);
    this.app.disable('x-powered-by');

    this.app.use(morgan('dev'));

    if (process.env.NODE_ENV === 'development') {
      this.app.use((req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', '*');
        res.setHeader('Access-Control-Allow-Headers', '*');
        res.setHeader('Access-Control-Max-Age', '86400');

        if (req.method === 'OPTIONS') { res.end(); return; }
        next();
      });
    }

    this.app.use(this.resolveRoutes);

    // catch 404 and forward to error handler
    this.app.use((req: Request, res: Response, next) => {
      next({ status: 404 });
    });

    // error handler
    this.app.use((err: { message?: string, status: number }, req: Request, res: Response, next: Function) => {
      const error = req.app.get('env') === 'development' ? err : { message: undefined };

      let message;
      if (req.headers.accept === 'application/json') {
        message = JSON.stringify(error.message);
      } else {
        message = `${err.message}<br><br><code>${JSON.stringify(error)}</code>`
      }

      res.status(err.status || 500);
      res.send(message);
    });
  }

  private createServer() {
    this.server = http.createServer(this.app);
    this.server.on('error', console.error);
    this.server.on('listening', () => {
      debug(`Listening on ${this.port}`);
    });
    this.server.on('close', () => {
      debug(`Server on port ${this.port} closed`);
    })
    this.server.listen(this.port);
  }

  public respond(reqId: number, result: any) {
    if (!(reqId in this.openRequests)) { return; }

    this.openRequests[reqId].json(result);
    delete this.openRequests[reqId];
  }

  public close() {
    this.server.close();
  }
}

export default Server;
