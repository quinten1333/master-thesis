import sys
import yaml
import json

from TextAnalyser import TextAnalyser
from Context import context

from services.gateway import stories as gatewayStories
from services.util import stories as utilStories
from services.database import stories as databaseStories

serviceStories = [*gatewayStories, *utilStories, *databaseStories]
textAnalyser = TextAnalyser()

def tokenizeStory(gerkinStory):
  tokens = textAnalyser.tokenize('given ' + gerkinStory['given'])
  tokens.pop(0)  # Remove "Given"
  given = { 'do': ' '.join(tokens) }

  then = []
  for sentence in gerkinStory['then']:
    if type(sentence) != str:
      then.append({
        **sentence,
        'do': ' '.join(textAnalyser.tokenize(sentence['do'])),
      })
      continue

    then.append({
      'do': ' '.join(textAnalyser.tokenize(sentence))
    })

  return [given, *then]


def findMatchingStory(inputStory):
  for story in serviceStories:
    conf = story.run(inputStory)
    if conf:
      return conf

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
  select = []
  for key in pre['select']:
    select.append(normalizeSelection(key))

  return {
    **pre,
    'select': select,
  }

def normalizePost(post):
  upsert = []
  for key in post['upsert']:
    upsert.append(normalizeSelection(key))

  return {
    **post,
    'upsert': upsert,
  }


if __name__ == "__main__":
  if len(sys.argv) < 2:
    print('Please give input file', file=sys.stderr)
    sys.exit(1)

  command = None
  if len(sys.argv) >= 3:
    command = sys.argv[2]

  inFile = sys.argv[1] if sys.argv[1] != '--' else '/dev/stdin'
  with open(inFile, 'r') as file:
    doc = yaml.safe_load(file)

  if 'name' not in doc :
    raise BaseException('No name given in YAML doc')
  if 'endpoint' not in doc :
    raise BaseException('No endpoint given in YAML doc')
  if 'datasets' not in doc:
    raise BaseException('No datasets given in YAML doc')
  if 'userStories' not in doc :
    raise BaseException('No userStories given in YAML doc')

  # TODO: Validate structure of datasets and userStories

  inputStories = [tokenizeStory(inputStory) for inputStory in doc['userStories']]
  if command == 'debug':
    for story in inputStories:
      for step in story:
        print(step)
      print()
    exit(0)


  context.set(doc)
  pipelines = []
  for inputStory in inputStories:
    steps = []
    for step in inputStory:
      conf = findMatchingStory(step['do'])
      if not conf:
        print(f'Sentence "{step["do"]}" could not be matched with a story from a block', file=sys.stderr)
        exit(1)

      if type(conf) != dict:
        conf = conf.getConfig()

      if 'pre' in step: conf['pre'] = normalizePre(step['pre'])
      if 'post' in step: conf['post'] = normalizePost(step['post'])
      steps.append(conf)
    pipelines.append({
      'steps': steps
    })


  print(json.dumps(pipelines))
  doc['pipelines'] = pipelines
  with open(sys.argv[1] + '-compiled.yml', 'w') as outFile:
    yaml.dump(doc, outFile)

