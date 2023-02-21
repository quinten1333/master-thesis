import re

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
