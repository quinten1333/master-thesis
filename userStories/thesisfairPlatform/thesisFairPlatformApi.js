import axios from 'axios';

const server = axios.create({
  baseURL: 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

server.interceptors.response.use((response) => {
  if (response.data.error) { throw new Error(response.data.error); }
  if (response.status !== 200) { return response; }

  return response.data;
});

let token = null;

const api = {
  user: {
    login: async (username, password) => {
      const res = await server.post('/user/login', { username, password });
      token = res.JWTToken
    },
    validate: async () => {
      return await server.post('/user/validate', { token });
    }
  },
}

export default api;
