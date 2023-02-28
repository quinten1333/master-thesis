import sys
import yaml
from collections import defaultdict

from .Context import context
from .normalize import normalizeStory
from .TextAnalyser import tokenizeStory
from .Story.Manager import StoryManager

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

def handleInput():
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

  return [doc, command]


def validateStory(userStory):
  def check_step(step):
    if 'condition' in step:
      if 'steps' in step:
        if 'condition' in step['steps'][0]:
          raise BaseException(f'Cannot nest two conditions directly after each other.\nFirst condition {step["condition"]}\nSecond condition {step["steps"][0]["condition"]}')

        for childStep in step['steps']:
          check_step(childStep)

  if 'condition' not in userStory:
    raise BaseException('User story missing condition in given')

  if 'steps' not in userStory:
    raise BaseException('User story missing steps in then')

  for step in userStory['steps']:
    check_step(step)


def genCFG(userStory: list) -> dict: # TODO: Add offset to goto statements
  """
    Make a proper graph from the stories.
    This is done by doing two passes. First resolving the local graph which will
    be followed if all the conditions turn out to be false. In a second pass
    all conditions are entered recursively, resolved and added to the stepsDict.

    The step list is converted into a dictionary to keep the id's stable, hence
     the function returns a dictionary.
  """
  stepCount = 0

  def getNextCommand(stepsDict, startId):
    id = startId + 1
    while id < stepCount and id in stepsDict and 'condition' in stepsDict[id]:
      id += 1

    if id == stepCount:
      return None

    return id

  def resolveLocal(stepsDict, returnStep):
    for stepId, step in stepsDict.items():
      outStep = getNextCommand(stepsDict, stepId)
      if outStep:
        step['outStep'] = outStep

  def addCondition(step, condition):
    if 'outCondition' not in step:
      step['outCondition'] = []

    step['outCondition'].append(condition)

  def _genCFG(userStory, returnStep=None):
    nonlocal stepCount

    if 'condition' not in userStory or 'steps' not in userStory:
      print('Internal error: Did not receive a user story', file=sys.stderr)
      exit(0)

    steps = [userStory['condition'], *userStory['steps']]
    stepsDict = {i + stepCount: step for i, step in enumerate(steps)}
    stepCount += len(steps)

    resolveLocal(stepsDict, returnStep)

    lastCommand = 0
    for stepId, step in { **stepsDict }.items(): # Move substories to command outCondition
      if 'condition' in step:
        addCondition(stepsDict[lastCommand], _genCFG(step, getNextCommand(stepsDict, stepId) or returnStep))
        del stepsDict[stepId]
        continue

      lastCommand = stepId

    if returnStep:
      stepsDict[lastCommand]['outStep'] = returnStep

    return stepsDict

  return _genCFG(userStory)

def unfoldCFG(stepsDict):
  id = 0
  while id <= max(stepsDict.keys()):
    if id not in stepsDict:
      id += 1
      continue

    step = stepsDict[id]
    if 'outCondition' in step:
      for sid, story in enumerate(step['outCondition']):
        cid = min(story.keys())
        condition = story[cid]
        del story[cid]

        step['outCondition'][sid] = {
          'do': condition['do'],
          'outStep': condition['outStep'],
        }
        stepsDict = { **stepsDict, **story }

    id += 1

  return stepsDict


def getTargets(story: dict) -> list:
  targets = []
  if 'outStep' in story: targets.append(story)
  if 'outCondition' in story: targets.extend(story['outCondition'])

  return targets

def controllFlowGraphKeywords(flattenedStory: dict) -> dict:
  for story in flattenedStory.values():
    for cond in getTargets(story):
      target = flattenedStory[cond['outStep']]

      if 'op' in target:
        if target['op'] == 'stop':
          del cond['outStep']
        elif target['op'] == 'goto':
          cond['outStep'] = target['step']


  return flattenedStory

def cleanupCFG(cfgStory: dict) -> dict:
  """
    Remove all steps which are no longer referenced by any other steps
  """

  count = defaultdict(lambda: 0)
  count[0] += 1 # First step is always used at least once
  res = {**cfgStory}

  for step in cfgStory.values():
    for target in getTargets(step):
      if 'outStep' in target:
        count[target['outStep']] += 1

  for stepId in cfgStory.keys():
    if count[stepId] != 0: continue

    # print('Deleting step ', stepId)
    del res[stepId]

  return res

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
    conf = serviceStories.findMatchingStory(step['do'])

    step = {
      **step,
      **conf,
    }

    steps[stepId] = step

  return {
    'steps': steps
  }

if __name__ == "__main__":
  [doc, command] = handleInput()
  context.set(doc)


  normalStories = [normalizeStory(userStory) for userStory in context.userStories]
  if command == 'normalized': printNormalStories(normalStories); exit(0)

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

  conditionStories.loadDir('condition')
  cfgCondParsedStories = [parseConditions(story) for story in cfgCleanStories]
  if command == 'conditionsParsed': printStoriesDict(cfgCondParsedStories); exit(0)

  serviceStories.loadDir('service')
  pipelines = [parseStory(userStory) for userStory in cfgCondParsedStories]
  if command == 'pipelines': print(pipelines); exit(0)

  if command:
    print('Warning: Command not found')

  printStoriesDict(cfgCleanStories)
  doc['pipelines'] = pipelines
  with open('compiled.yml', 'w') as outFile:
    yaml.dump(doc, outFile)
