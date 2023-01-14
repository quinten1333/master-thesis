import http from 'http';
import app, { io } from './app.js'
import debugLib from 'debug';
const debug = debugLib('gateway:index');

const port = parseInt(process.env.PORT) || 3000;

app.set('port', port);
const server = http.createServer(app);

server.on('error', console.error);
server.on('listening', () => {
  debug(`Listening on ${port}`);
});

io.start().then(() => {
  server.listen(port);
})
