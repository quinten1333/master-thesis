from ..Story import Story, sobj
from ...Context import context
from ...exceptions import *


class JWTConfig:
  def __init__(self, fn):
    self.config = { 'block': 'auth', 'fn': fn }
    self.args = {}

  def set(self, option, value):
    if option in self.args:
      raise CompileError(f'Tried to set JWT {option} twice!')

    self.args[option] = value
    return self

  def setSecret(self, datasetName):
    dataset = context.findDataset(datasetName)
    if dataset['type'] != 'secret':
      raise CompileError(f'JWT secret should reference a dataset of type secret. "{datasetName}" is of type "{dataset["type"]}"')

    self.args['secret'] = dataset['value']
    self.args['secretEncoding'] = dataset['encoding']

    return self

  def getConfig(self):
    config = {**self.config, 'extraArgs': [self.args]}
    return config

createStory = Story('^create JWT token', lambda config, match: JWTConfig('createJWT'))
createStory.register(Story(f'secret {sobj}', lambda config, match, secret: config.setSecret(secret)))
createStory.register(Story(f'algorithm {sobj}', lambda config, match, algorithm: config.set('algorithm', algorithm)))
createStory.register(Story(f'expires {sobj}', lambda config, match, expires: config.set('expiresIn', expires)))
createStory.register(Story(f'issued {sobj}', lambda config, match, issued: config.set('issued', issued)))
createStory.register(Story(f'not used {sobj}', lambda config, match, notBefore: config.set('notBefore', notBefore)))
createStory.register(Story(f'subject {sobj}', lambda config, match, subject: config.set('subject', subject)))

validateStory = Story('^validate JWT', lambda config, match: JWTConfig('validateJWT'))
validateStory.register(Story(f'secret {sobj}', lambda config, match, secret: config.setSecret(secret)))


stories = [
  createStory,
  validateStory
]
