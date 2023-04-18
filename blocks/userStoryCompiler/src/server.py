from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import base64
import yaml
import traceback

import compiler
import drawer

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

lock = False
def lockFn(func):
  def wrapper(*args, **kwargs):
    global lock
    if lock:
      return { 'error': 'Other compilation in process' }

    try:
      res = func(*args, **kwargs)
    except BaseException as e:
      lock = False
      raise e

    lock = False
    return res

  return wrapper

@app.get("/")
def root():
  return 'Hi there! You have reached the root route of the userStoryCompiler. Please send another request after the beep... BEEP'

class CompileBody(BaseModel):
  yaml: str

@app.post("/compile")
def getCompiled(body: CompileBody):
  @lockFn
  def lockedFn():
    if not body.yaml:
      return { 'error': 'Missing yaml parameter' }

    try:
      doc = yaml.safe_load(body.yaml)
      return { 'data': yaml.dump(compiler.main(doc)) }
    except BaseException as e:
      return { 'error': traceback.format_exc() }

  return lockedFn()


class DrawBody(BaseModel):
  steps: object
  type: str | None

@app.post('/draw')
def getDrawing(body: DrawBody):
  img = drawer.genImage(body.steps, body.type or 'jpg')
  return Response(img, media_type='image/jpeg')
