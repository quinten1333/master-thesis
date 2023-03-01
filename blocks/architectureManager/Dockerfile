#syntax=docker/dockerfile:1.4

FROM alpine:latest
RUN apk add --no-cache npm nodejs
LABEL org.opencontainers.image.source https://github.com/quinten1333/master-thesis

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /app
COPY ./package*.json ./
COPY ./tsconfig.json ./
RUN npm ci

COPY ./src ./src

COPY ./frontend ./frontend
RUN cd frontend && npm ci

RUN npm run build

RUN rm -r frontend

# Python part
RUN apk add --no-cache python3 py3-pip

WORKDIR /python/compiler
COPY --from=libs ./userStoryCompiler /python/compiler
RUN pip install -r requirements.txt
RUN python3 setup.py

WORKDIR /python/drawer
COPY --from=libs ./userStoryDrawer /python/drawer
RUN pip install -r requirements.txt
RUN python3 setup.py


WORKDIR /app
ENTRYPOINT npm start
