import express, { Express, Request, Response } from 'express';
import morgan from 'morgan';
import http from 'node:http';
import debugLib from 'debug';
const debug = debugLib('gateway:app');

type Pipeline = any;

export type Route = {
  method?: string
  path: string
  params: { [name: string]: { type: string } }
  pipeline: Pipeline
};

type CompiledRoutes = {
  [method: string]: {
    [path: string]: {
      params: { [name: string]: { type: string } }
      pipeline: Pipeline
    }
  }
};

class Server {
  port: number
  private app: Express
  private server: http.Server
  private openRequests: { [id: number]: Response }

  private routes: CompiledRoutes = {}

  constructor(port: number) {
    this.port = port;
    this.openRequests = {};

    this.createApp();
    this.createServer();
  }

  public loadRoutes = (pipeline: Pipeline, routes: Route[]) => {
    for (const route of routes) {
      const method = (route.method || 'GET').toUpperCase();
      if (!(method in this.routes)) {
        this.routes[method] = {};
      }

      if (route.path in this.routes[method]) {
        throw new Error(`Route "${route.path}" already registered!`);
      }

      this.routes[method][route.path] = {
        params: route.params,
        pipeline: pipeline,
      }
    }
  };

  public unloadPipeline = (pipeline: Pipeline) => {
    for (const method in this.routes) {
      for (const path in this.routes[method]) {
        if (this.routes[method][path].pipeline === pipeline) {
          delete this.routes[method][path];
        }
      }

      if (Object.keys(this.routes[method]).length === 0) {
        delete this.routes[method];
      }
    }
  }

  public hasRoutes = () => {
    return Object.keys(this.routes).length > 0;
  }

  private parseValue = (type: string, value: any) => {
    let num: number;
    switch (type) {
      case 'string':
        return value;

      case 'integer':
          num = parseInt(value);
          if (Number.isNaN(num)) {
            return undefined;
          }
          return num;

      case 'number':
      case 'float':
        num = parseFloat(value);
        if (Number.isNaN(num)) {
          return undefined;
        }
        return num;

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
      const data = req.method === 'GET' ? req.query : req.body;

      if (!(param in data)) { next({ status: 400, message: `Missing parameter "${param}".`}); return; }
      const paramConf = route.params[param];

      params[param] = this.parseValue(paramConf.type, data[param]);
      if (params[param] === undefined) { next({ status: 400, message: `Parameter "${param}" does not have type "${paramConf.type}".` }); return; }
    }

    const reqId = route.pipeline.run(params);
    this.openRequests[reqId] = res;
  }

  private createApp() {
    this.app = express();
    this.app.set('port', this.port);
    this.app.disable('x-powered-by');

    this.app.use(morgan('dev'));
    this.app.use(express.json({}));
    this.app.use(express.urlencoded({ extended: true }));

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

  public respond(reqId: number, result: any, status: number) {
    if (!(reqId in this.openRequests)) { return; }

    this.openRequests[reqId].status(status);
    this.openRequests[reqId].json(result);
    delete this.openRequests[reqId];
  }

  public close() {
    this.server.close();
  }
}

export default Server;
