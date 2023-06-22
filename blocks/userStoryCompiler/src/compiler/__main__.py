import sys
import yaml
from pathlib import Path

from .exceptions import *
from .Context import context
from .normalize import normalizeStory
from .TextAnalyser import tokenizeStory
from .Story.Manager import StoryManager
from .cfg import genCFG, unfoldCFG, controllFlowGraphKeywords, cleanupCFG, getTargetIds
from .prepost import compilePrePost
from .datasets import compileDatasets
from .environments import validateEnvironments, normalizeEnvironment, resolveEnvironment, pipelinesPerEnvironment

serviceStories = StoryManager()
conditionStories = StoryManager()

def printNormalStories(userStories: list):
  for story in userStories:
    print(0, '-', story['condition'])
    for i, step in enumerate(story['steps']):
      print(i + 1, '-', step)
    print()

def printFoldedCFG(userStories: list):
  def printStory(story: dict, depth=0):
    for stepId, step in story.items():
      if 'outCondition' in step:
        outCondition = step['outCondition']
        step = { **step }
        del step['outCondition']

        print(' ' * depth, stepId, '-', step)
        for condStory in outCondition:
          print('--' * depth, '--')
          printStory(condStory, depth + 2)

        continue
      print(' ' * depth, stepId, '-', step)

  for story in userStories:
    printStory(story)
    print()

def printStories(userStories: list):
  for story in userStories:
    for i, step in enumerate(story):
      print(i, '-', step)
    print()

def printStoriesDict(userStories: dict):
  for storyDict in userStories:
    for stepId in storyDict:
      print(stepId, '-', storyDict[stepId])
    print()

def validateInput(doc):
  if 'name' not in doc :
    raise InputError('No name given in YAML doc')
  if 'id' not in doc :
    raise InputError('No id given in YAML doc')
  if 'environments' not in doc :
    raise InputError('No environments given in YAML doc')
  if 'datasets' not in doc:
    raise InputError('No datasets given in YAML doc')
  if 'userStories' not in doc :
    raise InputError('No userStories given in YAML doc')

  # TODO: Validate structure of datasets and userStories

def resolveStories(stories: list, root):
  newStories = []
  for i, story in enumerate(stories):
    if type(story) != str:
      newStories.append(story)
      continue

    if not story.startswith('import '):
      newStories.append(story)
      continue

    path = root.joinpath(story[7:])
    with path.open('r') as file:
      ymlDoc = file.read()
    content = yaml.safe_load(ymlDoc)

    if type(content) != list:
      raise InputError('Imported file does not contain a list of user stories!')

    newStories.extend(content)
  return newStories


def validateStory(userStory):
  def check_step(step):
    if 'condition' in step:
      if 'steps' in step:
        if 'condition' in step['steps'][0]:
          raise InputError(f'Cannot nest two conditions directly after each other.\nFirst condition {step["condition"]}\nSecond condition {step["steps"][0]["condition"]}')

        for childStep in step['steps']:
          check_step(childStep)

  if 'condition' not in userStory:
    raise InputError('User story missing condition in given')

  if 'steps' not in userStory:
    raise InputError('User story missing steps in then')

  for step in userStory['steps']:
    check_step(step)

def parseConditions(cfgStory: dict) -> dict:
  for step in cfgStory.values():
    if 'outCondition' not in step: continue

    for i in range(len(step['outCondition'])):
      conf = conditionStories.findMatchingStory(step['outCondition'][i]['do'])
      step['outCondition'][i] = {
        **step['outCondition'][i],
        **conf,
      }
      del step['outCondition'][i]['do']



  return cfgStory

def parseStory(cfgStory: dict) -> dict:
  steps = {}
  for stepId, step in cfgStory.items():
    if 'do' not in step:
      steps[stepId] = step
      continue

    conf = serviceStories.findMatchingStory(step['do'])

    step = {
      **step,
      **conf,
    }

    steps[stepId] = step

  return steps


def validatePipeline(steps: dict):
  """
  Simple check which validates if all referenced steps actually exist.
  """
  for step in steps.values():
    for targetId in getTargetIds(step):
      assert targetId in steps


def main(doc, root=False, command=None, debug=False):
  validateInput(doc)
  context.set(doc) # Not thread safe
  userStories = context.userStories
  del doc['userStories']

  resolvedStories = resolveStories(userStories, root) if root else userStories
  if command == 'resolved': print(resolvedStories); exit(0)

  normalStories = [normalizeStory(userStory) for userStory in resolvedStories]
  if command == 'normalized': printNormalStories(normalStories); exit(0)

  validateEnvironments(context.environments)
  for normalStory in normalStories: validateStory(normalStory)
  if command == 'validated': printNormalStories(normalStories); print('validated'); exit(0)

  tokenizedStories = [tokenizeStory(userStory) for userStory in normalStories]
  if command == 'tokenized': printNormalStories(tokenizedStories); exit(0)

  cfgStories = [genCFG(userStory) for userStory in tokenizedStories]
  if command == 'cfg': printFoldedCFG(cfgStories); exit(0)

  unfoldedStories = [unfoldCFG(userStory) for userStory in cfgStories]
  if command == 'cfgUnfolded': printStoriesDict(unfoldedStories); exit(0)

  cfgCleanStories = [cleanupCFG(controllFlowGraphKeywords(story)) for story in unfoldedStories]
  if command == 'cfgClean': printStoriesDict(cfgCleanStories); exit(0)

  prePostStories = [compilePrePost(story) for story in cfgCleanStories]
  if command == 'prepost': printStoriesDict(prePostStories); exit(0)

  context.doc['datasets'] = compileDatasets(context.datasets)
  if command == 'datasets': print(context.datasets); exit(0)

  environmentResolvedStories = [resolveEnvironment(pipelineId, normalizeEnvironment(story)) for pipelineId, story in enumerate(prePostStories)]
  if command == 'environments': printStoriesDict(environmentResolvedStories); exit(0)

  conditionStories.loadDir('condition')
  cfgCondParsedStories = [parseConditions(story) for story in environmentResolvedStories]
  if command == 'conditionsParsed': printStoriesDict(cfgCondParsedStories); exit(0)

  serviceStories.loadDir('service')
  parsed = [parseStory(userStory) for userStory in cfgCondParsedStories]
  if command == 'parsed': print(parsed); exit(0)

  [validatePipeline(pipeline) for pipeline in parsed]

  doc['environments'] = pipelinesPerEnvironment(parsed)

  if command:
    print('Warning: Command not found')

  if debug: printStoriesDict(cfgCleanStories)
  return doc

def cli(argv, debug=False):
  if len(argv) < 2:
    print('Please give input file', file=sys.stderr)
    sys.exit(1)

  command = None
  if len(argv) >= 3:
    command = argv[2]

  if command == 'debug':
    command = ''
    debug = True

  inFile = sys.argv[1] if sys.argv[1] != '--' else '/dev/stdin'
  root = Path.cwd().joinpath(Path(sys.argv[1])).parent if sys.argv[1] != '--' else Path.cwd()
  with open(inFile, 'r') as file:
    ymlDoc = file.read()

  return main(yaml.safe_load(ymlDoc), root, command, debug)

if __name__ == "__main__":
  doc = cli(sys.argv, debug=True)
  with open('compiled.yml', 'w') as outFile:
    yaml.dump(doc, outFile)
