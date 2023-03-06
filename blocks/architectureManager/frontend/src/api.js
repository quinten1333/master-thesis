import axios from 'axios';

const browser = typeof localStorage !== 'undefined';

const archManager = axios.create({
  baseURL: 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

archManager.interceptors.response.use((response) => {
  if (response.data.error) { throw new Error(response.data.error); }
  if (response.status !== 200) { return response; }

  return response.data;
});

const userStories = axios.create({
  baseURL: 'http://localhost:3003/',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

userStories.interceptors.response.use((response) => {
  if (response.data.error) { throw new Error(response.data.error); }
  if (response.status !== 200) { return response; }

  return response.data;
});

const api = {
  architecture: {
    getAll: async () => {
      return await archManager.get('/architecture/all');
    },
    get: async (id) => {
      return await archManager.get(`/architecture/${id}`);
    },
    setActive: async (id, state) => {
      return await archManager.patch(`/architecture/${id}`, { state: state });
    },
    create: async (yaml) => {
      return await archManager.post('/architecture', { yaml: yaml });
    },
  },

  userStories: {
    compile: async (yaml) => {
      return await userStories.post('/compile', { yaml: yaml });
    },
    draw: async (yaml) => {
      return await userStories.post('/draw', { yaml: yaml })
    },
  },
}

export default api;
