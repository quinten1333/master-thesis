from fastapi import FastAPI

import compiler
import drawer

app = FastAPI()

@app.get("/")
def getCompiled():
  return { "hi": "yeah" }

@app.get('/hi')
def test():
  return 'yeah'
