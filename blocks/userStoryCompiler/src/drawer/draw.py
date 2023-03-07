import sys
import yaml
import subprocess
from pathlib import Path

def read():
  inFile = sys.argv[1] if sys.argv[1] != '--' else '/dev/stdin'
  with open(inFile, 'r') as file:
    doc = yaml.safe_load(file)

  if 'pipelines' not in doc:
    print('Error: No pipelines found in file', file=sys.stderr)
    exit(1)

  return doc['pipelines']

def genName(stepId, steps):
  step = steps[stepId]
  escapedDo = step['do'].replace('"', '\\"')
  return f'{stepId} - {escapedDo}'

if __name__ == '__main__':
  pipelines = read()

  for pid, pipeline in enumerate(pipelines):
    steps = pipeline['steps']

    dotFile = Path(f'./{pid}.dot')
    with open(dotFile, 'w') as file:
      print('digraph G {', file=file)
      for stepId, step in steps.items():
        if 'outStep' in step:
          print(f'"{genName(stepId, steps)}" -> "{genName(step["outStep"], steps)}"', file=file)

        if 'outCondition' in step:
          for cond in step['outCondition']:
            escapedFn = cond['fn'].replace('"', '\\"')
            print(f'"{genName(stepId, steps)}" -> "{genName(cond["outStep"], steps)}" [ label="{escapedFn}" ];', file=file)
      print('}', file=file)

    subprocess.run(['dot', f'{pid}.dot', '-Tjpg', '-o', f'{pid}.jpg'], check=True)
    dotFile.unlink()
