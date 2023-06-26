import Pipelinemessaging from '@amicopo/pipelinemessaging';
import Server from './app.js';
import axios from 'axios';


const io = new Pipelinemessaging();

const server = new Server();
server.setIo(io);

io.register('send', async ({ input, reqId }, args: { endpoint: string, sharedSecret: string, outStep: number, architectureId: number, pipelineId: number}) => {
  await axios.post(args.endpoint, {
    architectureId: args.architectureId,
    pipelineId: args.pipelineId,
    sharedSecret: args.sharedSecret,

    reqId: reqId,
    step: args.outStep,
    context: input,
  });
});
io.register('receive', () => { throw new Error('The receive function should never be executed'); }) // So the function exists, however this will never be executed.

io.start();
