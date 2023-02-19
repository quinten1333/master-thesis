import sys
import yaml
import json
from collections import defaultdict

from Context import context
from storyUtil import normalizeStory, tokenizeStory, findMatchingStory

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

def flattenStory(userStory: list, stepOffset=0, retStep=-1) -> dict: # TOOD: Add stop and goto
  """
    Make a proper graph from the stories.
    This is done by doing two passes. First resolving the local graph which will
    be followed if all the conditions turn out to be false. In a second pass
    all conditions are entered recursively, resolved and added to the stepsDict.

    The step list is converted into a dictionary to keep the id's stable, hence
     the function returns a dictionary.
  """
  stepsDict = {i + stepOffset: step for i, step in enumerate(userStory)}
  steps = len(userStory) + stepOffset

  # Add offset to goto statements

  def getConditionsAhead(startId, firstPass=True, retStep=-1):
    """
      On first pass it only returns the amount of condition "steps" there are ahead.
      On second pas it recursively enters all conditions, resolves their graphs
      and adds them to the stepsDict, flattening the structure into a
      conditional directed graph.
    """
    nonlocal stepsDict, steps

    id = startId + 1
    conditions = []
    newStepsDict = { **stepsDict }
    newSteps = steps
    while 'condition' in stepsDict[id]:
      condition = stepsDict[id]

      if not firstPass:
        storySteps = flattenStory(condition['steps'], newSteps, retStep)
        outStep = newSteps
        newSteps += len(condition['steps'])
        newStepsDict = { **newStepsDict, **storySteps}

        conditions.append({
          'do': condition['condition']['do'],
          'outStep': outStep,
        })
        del newStepsDict[id]

      id += 1

    if firstPass:
      return id - startId - 1

    stepsDict = newStepsDict
    steps = newSteps

    return conditions


  for stepId, step in stepsDict.items():
    if stepId == steps - 1:
      if retStep > 0:
        step['outStep'] = retStep
      continue

    step['outStep'] = stepId + getConditionsAhead(stepId, True) + 1

  # print('firstPass', stepsDict)

  stepsSnapshot = steps # Needed because steps counter will change during loop
  for stepId, step in stepsDict.items():
    if stepId == stepsSnapshot - 1:
      continue

    conditionsAhead = getConditionsAhead(stepId, False, step['outStep'])
    if conditionsAhead:
      stepsDict[stepId]['outCondition'] = conditionsAhead

  # print('Second pass', stepsDict)

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

def parseStory(cfgStory: dict) -> dict:
  steps = []
  for step in cfgStory.values():
    conf = findMatchingStory(step['do'])
    if not conf:
      print(f'Sentence "{step["do"]}" could not be matched with a story from a block', file=sys.stderr)
      exit(1)

    if type(conf) != dict:
      conf = conf.getConfig()

    step = {
      **step,
      **conf,
    }
    del step['do']

    steps.append(step)

  return {
    'steps': steps
  }

if __name__ == "__main__":
  [doc, command] = handleInput()
  context.set(doc)

  normalStories = [normalizeStory(userStory) for userStory in context.userStories]
  if command == 'normalized': print(normalStories); exit(0)

  tokenizedStories = [tokenizeStory(userStory) for userStory in normalStories]
  if command == 'tokenized': printStories(tokenizedStories); exit(0)

  flattenedStories = [flattenStory(userStory) for userStory in tokenizedStories]
  if command == 'flattened': printStoriesDict(flattenedStories); exit(0)

  cfgStories = [cleanupCFG(controllFlowGraphKeywords(flattenedStory)) for flattenedStory in flattenedStories]
  if command == 'cfg': printStoriesDict(cfgStories); exit(0)

  pipelines = [parseStory(userStory) for userStory in cfgStories]
  if command == 'pipelines': print(pipelines); exit(0)

  if command:
    print('Warning: Command not found')

  printStoriesDict(cfgStories)
  doc['pipelines'] = pipelines
  with open('compiled.yml', 'w') as outFile:
    yaml.dump(doc, outFile)

