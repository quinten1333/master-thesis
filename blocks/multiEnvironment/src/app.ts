import express, { Express, Request, Response, request, response } from 'express';
import morgan from 'morgan';
import http from 'node:http';
import debugLib from 'debug';
const debug = debugLib('multiEnvironment:app');

class Server {
  port: number
  private app: Express
  private server: http.Server
  private io: any

  constructor() {
    this.port = parseInt(process.env.PORT) || 80;

    this.createApp()
    this.createServer();
  }

  static findStepConfig(pipeline: any, searchStep: string) {
    for (const queue of Object.values(pipeline.pipeIO.queues)) {
      for (const step in queue.steps) {
        if (step == searchStep) {
          return queue.steps[step];
        }
      }
    }
  }

  setIo(io: any) {
    this.io = io;
  }

  createApp() {
    this.app = express();
    this.app.set('port', this.port);
    this.app.disable('x-powered-by');

    this.app.use(morgan('dev'));
    this.app.use(express.json({}));
    this.app.use(express.urlencoded({ extended: true }));

    this.app.post('/', (req: Request, res: Response, next) => {
      const {
        architectureId,
        pipelineId,
        sharedSecret,
        reqId,
        step,
        context,
      } = req.body;

      const arch: any = Object.values(this.io.arches).find((arch: any) => arch.id == architectureId);
      if (!arch) { next({ status: 400, message: 'Non-existing architectureId' }); return; }
      const pipeline = arch.pipelines.find((pipeline: any) => pipeline.pipeId == pipelineId)
      if (!pipeline) { next({ status: 400, message: 'Invalid pipelineId'}); return; }

      const stepConfig = Server.findStepConfig(pipeline, step);
      if (sharedSecret !== stepConfig.extraArgs[0].sharedSecret) {
        next({ status: 401, message: 'Invalid shared secret' });
        return;
      }

      pipeline.run(context, stepConfig, {}, reqId);
      res.status(200).end();
    })

    // catch 404 and forward to error handler
    this.app.use((req: Request, res: Response, next) => {
      next({ status: 404, message: 'Not found' });
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

  createServer() {
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
}

export default Server
