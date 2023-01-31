#syntax=docker/dockerfile:1.4

FROM node:latest
LABEL org.opencontainers.image.source https://github.com/quinten1333/master-thesis

ENV NODE_ENV=development

WORKDIR /app
COPY ./package*.json ./
COPY ./tsconfig.json ./
RUN npm ci

COPY ./src ./src

RUN npm run build
ENV NODE_ENV=production


ENTRYPOINT npm start
