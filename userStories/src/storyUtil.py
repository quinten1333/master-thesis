import re
from TextAnalyser import TextAnalyser

from services.gateway import stories as gatewayStories
from services.util import stories as utilStories
from services.database import stories as databaseStories

serviceStories = [*gatewayStories, *utilStories, *databaseStories]
textAnalyser = TextAnalyser()

def lmap(*args, **kwargs):
  return [*map(*args, **kwargs)]

gotoRegex = re.compile('^goto (\d+)')
def normalizeKeyword(text):
  if text == 'stop':
    return {
      'op': text
    }

  goto = gotoRegex.match(text)
  if goto:
    return {
      'op': 'goto',
      'step': goto.group(1)
    }

  return None

def normalizeSelection(text):
    split = text.split(' as ')
    if len(split) > 2:
      raise BaseException('Too many arguments')

    return {
      'from': split[0],
      'to': split[1] if len(split) == 2 else split[0]
    }

def normalizePre(pre):
  res = { **pre }
  if 'select' in pre: res['select'] = lmap(normalizeSelection, pre['select'])

  return res

def normalizePost(post):
  res = { **post }
  if 'upsert' in post: res['upsert'] = lmap(normalizeSelection, post['upsert'])

  return res

def normalizeStory(userStory):
  def _normalizeStep(step):
    if type(step) == str:
      keyword = normalizeKeyword(step)
      if keyword:
        return keyword

      return {
        'do': step
      }

    if 'given' in step:
      return normalizeStory(step)

    newStep = {**step}
    if 'pre' in step: newStep['pre'] = normalizePre(step['pre'])
    if 'post' in step: newStep['post'] = normalizePost(step['post'])
    return newStep

  return {
    'condition': { 'do': userStory['given'] },
    'steps': lmap(_normalizeStep, userStory['then'])
  }


def tokenizeStory(userStory):
  def _tokenizeStory(userStory):
    def _tokenizeStep(step):
      if 'op' in step: # Ignore op steps
        return step

      if 'condition' in step:
        return _tokenizeStory(step)

      return {
        **step,
        'do': ' '.join(textAnalyser.tokenize(step['do'])),
      }

    return {
      'condition': _tokenizeStep(userStory['condition']),
      'steps': lmap(_tokenizeStep, userStory['steps']),
    }

  story = _tokenizeStory(userStory)
  return [story['condition'], *story['steps']]


def findMatchingStory(inputStory):
  for story in serviceStories:
    conf = story.run(inputStory)
    if conf:
      return conf

  return None
