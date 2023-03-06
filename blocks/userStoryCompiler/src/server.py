from fastapi import FastAPI
from pydantic import BaseModel
import yaml

import compiler
import drawer

app = FastAPI()

class CompileBody(BaseModel):
  yaml: str

@app.post("/compile")
def getCompiled(body: CompileBody):
  if not body.yaml:
    return { 'error': 'Missing yaml parameter' }

  doc = yaml.safe_load(body.yaml)
  try:
    return { 'data': yaml.dump(compiler.main(doc)) }
  except BaseException as e:
    return { 'error': str(e) }

@app.post('/draw')
def getDrawing():
  return 'TODO'
