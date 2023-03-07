FROM node:alpine
LABEL org.opencontainers.image.source https://github.com/quinten1333/master-thesis

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
ENV PORT=80
EXPOSE 80

WORKDIR /app
COPY ./package*.json ./
COPY ./tsconfig.json ./
RUN npm ci

COPY ./src ./src

COPY ./frontend ./frontend
RUN cd frontend && npm ci
RUN npm run build
RUN rm -r frontend

ENTRYPOINT npm start
