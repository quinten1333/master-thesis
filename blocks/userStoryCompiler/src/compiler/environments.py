import secrets

from .exceptions import *
from .cfg import getTargets
from .Context import context

def validateEnvironments(environments: dict):
  for env in environments.values():
    if 'endpoint' not in env:
      raise InputError(f"Environment {env} does not contain a runtime endpoint")
    if 'managementEndpoint' not in env:
      raise InputError(f"Environment {env} does not contain a management endpoint")
    if 'pipelineEndpoint' not in env:
      raise InputError(f"Environment {env} does not contain a pipeline endpoint")


def normalizeEnvironment(story: dict):
  def getDefault():
    for env in context.environments:
      if 'default' in context.environments[env] and context.environments[env]['default']:
        return env

    return None
  defaultEnv = getDefault()

  for step in story.values():
    if 'environment' in step:
      if step['environment'] not in context.environments:
        raise InputError(f"Environment {step['environment']} specified in step is not defined.")

      continue

    if defaultEnv is None:
      raise InputError(f'Environment not specified for step while no environment has been set as default.')
    step['environment'] = defaultEnv

  return story


def resolveEnvironment(pipelineId, story: dict):
  newStory = {**story}
  highestStep = max(story.keys())

  for step in story.values():
    for cond in getTargets(step):
      target = story[cond['outStep']]

      if step['environment'] == target['environment']:
        continue

      sendingStep = highestStep + 1
      receivingStep = highestStep + 2
      highestStep += 2
      sharedSecret = secrets.token_urlsafe(16)

      newStory[sendingStep] = {
        'block': 'multiEnvironment',
        'fn': 'send',
        'environment': step['environment'],
        'extraArgs': [{
          'endpoint': context.environments[target['environment']]['pipelineEndpoint'],
          'sharedSecret': sharedSecret,
          'outStep': receivingStep,
          'architectureId': context.id,
          'pipelineId': pipelineId,
        }],
        'implicitOutStep': receivingStep,
      }
      newStory[receivingStep] = {
        'block': 'multiEnvironment',
        'fn': 'receive',
        'outStep': cond['outStep'],
        'environment': target['environment'],
        'extraArgs': [{
          'sharedSecret': sharedSecret,
        }],
      }
      cond['outStep'] = sendingStep

  return newStory


def pipelinesPerEnvironment(pipelines):
  environments = context.environments

  for env in environments.values():
    env['pipelines'] = {} # [{ steps: [] }]

  for pipelineId, pipeline in enumerate(pipelines):
    for stepId, step in pipeline.items():
      if pipelineId not in environments[step['environment']]['pipelines']:
        environments[step['environment']]['pipelines'][pipelineId] = { 'steps': { } }

      environments[step['environment']]['pipelines'][pipelineId]['steps'][stepId] = step
      del step['environment']

  return environments
