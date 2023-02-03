import sys
import yaml
import json

from TextAnalyser import TextAnalyser

from services.gateway import stories as gatewayStories
from services.util import stories as utilStories

serviceStories = [*gatewayStories, *utilStories]
textAnalyser = TextAnalyser()

def tokenizeStory(gerkinStory):
  tokens = textAnalyser.tokenize('given ' + gerkinStory['given'])
  tokens.pop(0)  # Remove "Given"
  given = ' '.join(tokens)

  then = [' '.join(textAnalyser.tokenize(sentence)) for sentence in gerkinStory['then']]
  return [given, *then]


def findMatchingStory(inputStory):
  for story in serviceStories:
    conf = story.run(inputStory)
    if conf:
      break

  return conf


if __name__ == "__main__":
  if len(sys.argv) < 2:
    print('Please give input', file=sys.stderr)
    sys.exit(1)

  command = None
  if len(sys.argv) >= 3:
    command = sys.argv[2]

  with open(sys.argv[1], 'r') as file:
    doc = yaml.safe_load(file)

  if 'name' not in doc :
    raise 'No name given in YAML doc'
  if 'endpoint' not in doc :
    raise 'No endpoint given in YAML doc'
  if 'userStories' not in doc :
    raise 'No userStories given in YAML doc'


  inputStories = [tokenizeStory(inputStory) for inputStory in doc['userStories']]
  if command == 'debug':
    print('\n\n\n'.join(('\n'.join(inputStory) for inputStory in inputStories)))
    exit(0)

  pipelines = []
  for inputStory in inputStories:
    steps = []
    for step in inputStory:
      conf = findMatchingStory(step)
      if not conf:
        print(f'Sentence "{step}" could not be matched with a story from a block', file=sys.stderr)
        exit(1)

      if type(conf) != dict:
        conf = conf.getConfig()

      steps.append(conf)
    pipelines.append(steps)

  print(json.dumps(pipelines))

