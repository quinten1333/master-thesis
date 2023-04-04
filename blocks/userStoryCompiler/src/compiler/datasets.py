from .exceptions import *
import secrets

def compileDatasets(datasets):
  datasets = {**datasets}

  for name, dataset in datasets.items():
    datasets[name] = compileDataset(name, dataset)

  return datasets

def compileDataset(name, dataset):
  if 'type' not in dataset:
    raise InputError(f'Dataset "{name}" does not have a type!')

  if dataset['type'] == 'secret':
    return compileSecret(name, dataset)

  return dataset


def compileSecret(name, dataset):
  if 'generate' in dataset and dataset['generate'] == True:
    if 'size' not in dataset:
      raise InputError(f'Dataset "{name}": The size option is mendatory when auto generating.')
    if type(dataset['size']) != int:
      raise InputError(f'Dataset "{name}": Size "{dataset["size"]}" is not an integer.')

    return {
      'type': 'secret',
      'encoding': 'base64',
      'value': secrets.token_urlsafe(dataset['size'] // 8),
    }

  if 'value' in dataset:
    return {
      'type': 'secret',
      'encoding': 'utf8',
      'value': dataset['value'],
    }

  raise InputError(f'Dataset "{name}": Does not contain a generate or value parameter')
