from TextAnalyser import TextAnalyser

from services.gateway import stories as gatewayStories
from services.util import stories as utilStories
from services.database import stories as databaseStories

serviceStories = [*gatewayStories, *utilStories, *databaseStories]
textAnalyser = TextAnalyser()

def lmap(*args, **kwargs):
  return [*map(*args, **kwargs)]

def normalizeSelection(text):
    split = text.split(' as ')
    if len(split) > 2:
      raise BaseException('Too many arguments')

    return {
      'from': split[0],
      'to': split[1] if len(split) == 2 else split[0]
    }

def normalizePre(pre):
  return {
    **pre,
    'select': lmap(normalizeSelection, pre['select']),
  }

def normalizePost(post):
  return {
    **post,
    'upsert': lmap(normalizeSelection, post['upsert']),
  }

def normalizeStory(userStory):
  def _normalizeStep(step):
    if type(step) == str:
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
