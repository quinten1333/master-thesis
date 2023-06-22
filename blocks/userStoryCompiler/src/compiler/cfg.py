from collections import defaultdict

from .exceptions import *

def genCFG(userStory: list) -> dict:
  """
    Make a controll flow graph from the list of steps by resolving the next
    step, conditions and goto statements. All conditions are moved into the
    command step that will execute the condition.
  """
  stepCount = 0

  def getNextCommand(stepsDict, startId):
    id = startId + 1
    while id < stepCount and (id not in stepsDict or 'condition' in stepsDict[id]):
      id += 1

    if id == stepCount:
      return None

    return id

  def getReturnConditions(stepsDict, startId):
    id = startId + 1
    conditions = []
    while id < stepCount:
      if id not in stepsDict:
        id += 1
        continue

      if 'condition' not in stepsDict[id]:
        break

      # Dict is needed because the system currently expects the full story to
      # be moved to the conditions array but here we are only doing a link.
      # Because this is pass by reference the correct outStep will be added
      # later in the process.
      conditions.append({ -1: stepsDict[id]['condition'] })
      id += 1

    if len(conditions) == 0:
      return None

    return conditions

  def resolveLocal(stepsDict, returnStep):
    for stepId, step in stepsDict.items():
      outStep = getNextCommand(stepsDict, stepId)
      if outStep:
        step['outStep'] = outStep

  def addCondition(step, condition):
    if 'outCondition' not in step:
      step['outCondition'] = []

    step['outCondition'].append(condition)

  def _genCFG(userStory, returnStep=None, returnConditions=None):
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
        addCondition(stepsDict[lastCommand], _genCFG(step, getNextCommand(stepsDict, stepId) or returnStep, getReturnConditions(stepsDict, stepId) or returnConditions))
        del stepsDict[stepId]
        continue

      if 'op' in step and step['op'] == 'goto':
        step['step'] = int(step['step']) + min(stepsDict.keys()) # Offset with id of condition from this story

      lastCommand = stepId

    if returnStep:
      stepsDict[lastCommand]['outStep'] = returnStep

    if returnConditions:
      stepsDict[lastCommand]['outCondition'] = returnConditions

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
          cond['outStep'] = int(target['step'])
          if cond['outStep'] not in flattenedStory:
            raise InputError('goto statement points to non-existing step. It is not possible to point a goto statement to a condition or other special operation at the moment.')


  return flattenedStory

def getTargetIds(story: dict) -> list:
  res = []
  for target in getTargets(story):
    if 'outStep' in target:
      res.append(target['outStep'])

  return res

def cleanupCFG(cfgStory: dict) -> dict:
  """
    Remove all steps which are no longer referenced by any other steps
  """

  count = defaultdict(lambda: 0)
  count[0] += 1 # First step is always used at least once
  res = {**cfgStory}

  for step in cfgStory.values():
    for targetId in getTargetIds(step):
      count[targetId] += 1

  for stepId in cfgStory.keys():
    if count[stepId] != 0: continue

    # print('Deleting step ', stepId)
    del res[stepId]

  return res
