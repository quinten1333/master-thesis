import axios from 'axios';

let token = null;
const server = axios.create({
  baseURL: process.env.gatewayUrl || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

server.interceptors.request.use((request) => {
  if (request.method !== 'get') {
    if (!request.data) {
      request.data = {};
    }

    request.data.token = token;
  } else {
    if (!request.params) {
      request.params = {};
    }

    request.params.token = token;
  }

  return request;
})

server.interceptors.response.use((response) => {
  if (response.data?.errors) { throw new Error(response.data.errors); }
  if (response.status !== 200) { return response; }

  return response.data;
}, (error) => {
  throw error.response.data;
});


const api = {
  user: {
    login: async (email, password) => {
      const res = await server.post('/user/login', { email, password });
      token = res.JWTToken;
    },
    logout: () => {
      token = null;
    },
    tokenPresent: () => !!token,
  },
  entity: {
    get:  (enid) => {
      return { exec: async () => await server.get('/entity', { params: { enid }}) };
    },
    getAll:  () => {
      return { exec: async () => await server.get('/entity/all') };
    },
    getMultiple:  (enids) => {
      return { exec: async () => await server.get('/entities', { params: { enids }}) };
    },

    create:  (entity) => {
      return { exec: async () => await server.post('/entity', entity) };
    },

    update:  (entity) => {
      return { exec: async () => await server.patch('/entity', entity) };
    },

    delete: (enid) => {
      return { exec: async () => await server.delete('/entity', { data: { enid }}) };
    },

    import: (entities) => {
      return { exec: async () => await server.post('/entity/import', { entities }) };
    },
  }
}

export default api;
