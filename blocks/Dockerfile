#syntax=docker/dockerfile:1.4

FROM node:latest
LABEL org.opencontainers.image.source https://github.com/quinten1333/master-thesis

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /app
COPY ./package*.json ./
RUN npm ci

COPY ./src ./src
COPY --from=libs . /libs

ENTRYPOINT npm start
