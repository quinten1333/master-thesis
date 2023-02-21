import re
from .TextAnalyser import TextAnalyser
from pathlib import Path
import importlib

textAnalyser = TextAnalyser()

stories = {}
def registerStories(type: str, newStories: list) -> None:
  if type not in stories:
    stories[type] = []

  stories[type].extend(newStories)
def getStories(type: str) -> list:
  return stories[type]


def loadStories(type: str) -> None:
  root = Path(__file__).parent.resolve(True)
  dir = root / type
  for fPath in dir.iterdir():
    if not fPath.is_file(): continue
    if not fPath.name.endswith('.py'): continue

    name = fPath.name[:-3]
    mod = importlib.import_module(f'.{type}.{name}', __package__)
    if not isinstance(mod.stories, list):
      raise BaseException(f'Error: .{type}.{name} does not define a stories array')

    registerStories(type, mod.stories)


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
  def _tokenizeStep(step):
    if 'op' in step: # Ignore op steps
      return step

    if 'condition' in step:
      return tokenizeStory(step)

    return {
      **step,
      'do': ' '.join(textAnalyser.tokenize(step['do'])),
    }

  return {
    'condition': _tokenizeStep(userStory['condition']),
    'steps': lmap(_tokenizeStep, userStory['steps']),
  }



def findMatchingStory(inputStory: str, type: str):
  for story in getStories(type):
    conf = story.run(inputStory)
    if conf:
      return conf

  return None
