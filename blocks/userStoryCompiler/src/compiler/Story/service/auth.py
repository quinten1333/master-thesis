from ..Story import Story, sobj, GenericConfig
from ...Context import context
from ...exceptions import *


createStory = Story('^create JWT token', lambda config, match: GenericConfig('auth', 'createJWT'))
createStory.register(Story(f'secret {sobj}', lambda config, match, secret: config.setSecret(secret)))
createStory.register(Story(f'algorithm {sobj}', lambda config, match, algorithm: config.set('algorithm', algorithm)))
createStory.register(Story(f'expires {sobj}', lambda config, match, expires: config.set('expiresIn', expires)))
createStory.register(Story(f'issued {sobj}', lambda config, match, issued: config.set('issued', issued)))
createStory.register(Story(f'not used {sobj}', lambda config, match, notBefore: config.set('notBefore', notBefore)))
createStory.register(Story(f'subject {sobj}', lambda config, match, subject: config.set('subject', subject)))

validateStory = Story('^validate JWT', lambda config, match: GenericConfig('auth', 'validateJWT'))
validateStory.register(Story(f'secret {sobj}', lambda config, match, secret: config.setSecret(secret)))

hashStory = Story('^hash', lambda config, match: GenericConfig('auth', 'hash'))
hashStory.register(Story(f'secret {sobj}', lambda config, match, secret: config.setSecret(secret)))

stories = [
  createStory,
  validateStory,
  hashStory,
  Story('^compare hash', lambda config, match: GenericConfig('auth', 'compareHash')),
]
