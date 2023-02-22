import axios from 'axios';

const browser = typeof localStorage !== 'undefined';

const server = axios.create({
  baseURL: 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

server.interceptors.response.use((response) => {
  if (response.status !== 200) {
    return response;
  }

  return response.data;
});

export default {
  architecture: {
    getAll: async () => {
      return await server.get('/architecture/all');
    },
    get: async (id) => {
      return await server.get(`/architecture/${id}`);
    },
    setActive: async (id, state) => {
      return await server.patch(`/architecture/${id}`, { state: state });
    }
  }
}
