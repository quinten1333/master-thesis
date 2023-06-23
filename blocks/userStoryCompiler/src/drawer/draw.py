import sys
import yaml
import subprocess

def read():
  inFile = sys.argv[1] if sys.argv[1] != '--' else '/dev/stdin'
  with open(inFile, 'r') as file:
    doc = yaml.safe_load(file)

  if 'environments' not in doc:
    print('Error: No environments found in file', file=sys.stderr)
    exit(1)

  pipelines = {}
  for envName in doc['environments']:
    for pipelineId in doc['environments'][envName]['pipelines']:
      if pipelineId not in pipelines:
        pipelines[pipelineId] = {}

      for stepId, step in doc['environments'][envName]['pipelines'][pipelineId]['steps'].items():
        step['environment'] = envName
        pipelines[pipelineId][stepId] = step

  print(pipelines)
  if len(pipelines.keys()) == 0:
    print('Error: No pipelines found in file', file=sys.stderr)
    exit(1)


  return pipelines

def genName(stepId, steps):
  step = steps[stepId]
  if 'do' in step:
    text = step['do'].replace('"', '\\"')
  else:
    text = f"{step['block']} - {step['fn']}"
  env = f'@{step["environment"]}' if "environment" in step else ''
  return f'{stepId}{env} - {text}'

def normalizeSteps(steps):
  """ Needed to normalize stepId type as JSON does not support integer keys in dictionary. """
  newSteps = {}
  for stepId, step in steps.items():
    newSteps[int(stepId)] = step

  return newSteps

def genImage(steps, type='jpg'):
  steps = normalizeSteps(steps)
  graph = 'digraph G {\n'
  for stepId, step in steps.items():
    step = steps[stepId]
    if 'implicitOutStep' in step and step['implicitOutStep'] in steps:
      step['outStep'] = step['implicitOutStep']

    if 'outStep' in step:
      graph += f'"{genName(stepId, steps)}" -> "{genName(step["outStep"], steps)}" [style="{"dotted" if "implicitOutStep" in step else "solid"}"]\n'

    if 'outCondition' in step:
      for cond in step['outCondition']:
        escapedFn = cond['fn'].replace('"', '\\"')
        graph += f'"{genName(stepId, steps)}" -> "{genName(cond["outStep"], steps)}" [ label="{escapedFn}" ];\n'
  graph += '}\n'

  if type == 'text':
    return graph

  image = subprocess.run(['dot', '-T' + type], check=True, input=graph.encode(), stdout=subprocess.PIPE)
  return image.stdout

if __name__ == '__main__':
  pipelines = read()

  for pid, pipeline in pipelines.items():
    with open(f'{pid}.jpg', 'wb') as file:
      file.write(genImage(pipeline))
