from fastapi import FastAPI
from pydantic import BaseModel
import yaml
import traceback

import compiler
import drawer

app = FastAPI()

class CompileBody(BaseModel):
  yaml: str

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

@app.post("/compile")
def getCompiled(body: CompileBody):
  @lockFn
  def lockedFn():
    if not body.yaml:
      return { 'error': 'Missing yaml parameter' }

    doc = yaml.safe_load(body.yaml)
    try:
      return { 'data': yaml.dump(compiler.main(doc)) }
    except BaseException as e:
      return { 'error': traceback.format_exc() }

  return lockedFn()

@app.post('/draw')
def getDrawing():
  return 'TODO'
