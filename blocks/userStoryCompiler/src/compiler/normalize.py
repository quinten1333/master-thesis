import re
from sys import stderr

from .exceptions import *

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
      if not step['given']:
        print('Warning: Empty condition found. Skipping it')
        return None
      if 'then' not in step or not step['then']:
        print(f'Warning: Condition "{step["given"]}" has no steps. Skipping it.')
        return None

      then = [*filter(lambda val: val, step['then'])] # Filter empty steps
      if len(step['then']) != len(then):
        print(f'Warning: Empty step in condition "{step["given"]}". Ignoring it.', file=stderr)
      step['then'] = then

      if len(step['then']) == 0: # Filter stories with no steps after filtering
        print(f'Warning: Condition "{step["given"]}" has no steps. Skipping it.', file=stderr)
        return None

      return normalizeStory(step)

    newStep = {**step}
    return newStep

  return {
    'condition': { 'do': userStory['given'] },
    'steps': [*filter(lambda val: val, map(_normalizeStep, userStory['then']))]
  }
