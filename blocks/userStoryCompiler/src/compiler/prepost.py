from .exceptions import *
from .TextAnalyser import textAnalyser
from .Story.Story import objCompiled, objParse

def lmap(*args, **kwargs):
  return [*map(*args, **kwargs)]

def normalizeSelection(text: str):
  split = ' '.join(textAnalyser.word_tokenize(text)).split(' as ')
  if len(split) > 2:
    raise ParseError(f'Text "{text}" contains multiple " as " statements.')

  split[0] = split[0].strip()
  if len(split) == 2: split[1] = split[1].strip()

  match = objCompiled.match(split[0])
  if match:
    if len(split) != 2:
      raise ParseError(f'When using literal values its required to specify its key (`value` as key).')

    return {
      'value': objParse(match.group(1)),
      'to': split[1]
    }

  return {
    'from': split[0],
    'to': split[1] if len(split) == 2 else split[0]
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
