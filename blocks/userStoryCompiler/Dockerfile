FROM python:3.11-alpine

WORKDIR /app

RUN apk add --no-cache graphviz ttf-dejavu

COPY ./requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY ./setup.py .
RUN python3 setup.py

COPY ./src /app/src

WORKDIR /app/src
EXPOSE 80
ENTRYPOINT ["uvicorn", "server:app", "--port", "80", "--host", "0.0.0.0"]
# --reload for automatic reloading
# --proxy-headers to trust the headers sent by the proxy
# https://fastapi.tiangolo.com/deployment/docker/#build-a-docker-image-for-fastapi
