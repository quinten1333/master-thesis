import Server from './built/app.js';

let server;

class ArchStub {
  id = 0;
  run = (params) => {
    console.log('Fake running architecture with', params);
    const reqId = ++this.id;

    setTimeout(() => {
      server.respond(reqId, 'Fake returning result');
    })

    return reqId;
  }
}

const routes = [
  {
    method: 'GET',
    path: '/',
    params: { params: { type: 'string' } },
  },
  {
    method: 'GET',
    path: '/num',
    params: { input: { type: 'number' } },
  },
]

const routes2 = [
  {
    path: '/hi',
    params: { input: { type: 'number' } }
  }
]

const stub1 = new ArchStub();
const stub2 = new ArchStub();
server = new Server(3000, stub1, routes);
server.loadRoutes(stub2, routes2);
server.unloadArch(stub1);
