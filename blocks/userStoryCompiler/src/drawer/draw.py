import sys
import yaml
import subprocess

def read():
  inFile = sys.argv[1] if sys.argv[1] != '--' else '/dev/stdin'
  with open(inFile, 'r') as file:
    doc = yaml.safe_load(file)

  if 'pipelines' not in doc:
    print('Error: No pipelines found in file', file=sys.stderr)
    exit(1)

  return doc['pipelines']

def genName(stepId, steps):
  step = steps[str(stepId)]
  escapedDo = step['do'].replace('"', '\\"')
  return f'{stepId} - {escapedDo}'

def genImage(steps, type='jpg'):
  graph = 'digraph G {\n'
  for stepId, step in steps.items():
    if 'outStep' in step:
      graph += f'"{genName(stepId, steps)}" -> "{genName(step["outStep"], steps)}"\n'

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

  for pid, pipeline in enumerate(pipelines):
    with open(f'{pid}.jpg', 'wb') as file:
      file.write(genImage(pipeline['steps']))
