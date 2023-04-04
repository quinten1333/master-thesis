import axios from 'axios';

const server = axios.create({
  baseURL: `https://gateway.${process.env.ROOT}`,
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
    register: async (username, email, password) => {
      return await server.post('/user', { username, email, password });
    },
    login: async (username, password) => {
      const res = await server.post('/user/login', { username, password });
      token = res.JWTToken
    },
    tokenPresent: () => !!token,
    validate: async () => {
      return await server.post('/user/validate', { token });
    }
  },
}

export default api;
