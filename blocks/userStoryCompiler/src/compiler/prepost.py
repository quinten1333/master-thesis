from .exceptions import *
from .TextAnalyser import textAnalyser
from .Story.Story import objCompiled, objParse

def lmap(*args, **kwargs):
  return [*map(*args, **kwargs)]

def normalizeSelection(text: str):
  tokens = textAnalyser.word_tokenize(text)

  key = tokens.pop(0).strip()
  to = None
  type = None
  if tokens and tokens[0] == 'as':
    tokens.pop(0)
    to = tokens.pop(0)
  if tokens and tokens[0] == 'type':
    tokens.pop(0)
    type = tokens.pop(0)

  match = objCompiled.match(key)
  if match:
    if to == None:
      raise ParseError(f'When using literal values its required to specify its key (`value` as key).')

    return {
      'value': objParse(match.group(1)),
      'to': to,
      **({ 'type': type } if type else {}),
    }

  return {
    'from': key,
    'to': to if to else key,
    **({ 'type': type } if type else {}),
  }

def normalizePick(text: str):
  tokenized = ' '.join(textAnalyser.word_tokenize(text))
  match = objCompiled.match(tokenized)
  if match:
    return {
      'value': objParse(match.group(1))
    }

  return {
    'key': text
  }


def normalizePre(pre):
  res = { **pre }
  if 'pick' in pre: res['pick'] = normalizePick(pre['pick'])
  if 'select' in pre: res['select'] = lmap(normalizeSelection, pre['select'])

  return res

def normalizePost(post):
  res = { **post }
  if 'upsert' in post: res['upsert'] = lmap(normalizeSelection, post['upsert'])

  return res

def compilePrePost(story: dict):
  for stepId, step in story.items():
    if 'pre' in step and step['pre']: step['pre'] = normalizePre(step['pre'])
    if 'post' in step and step['post']: step['post'] = normalizePost(step['post'])

  return story
