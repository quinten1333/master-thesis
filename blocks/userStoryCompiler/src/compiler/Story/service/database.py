from ..Story import Story, sobj
from ...Context import context

class Database:
  typeToBlock = {
    'mongodb': 'mongodb'
  }

  def __init__(self, datasetName, operation):
    self.datasetName = datasetName
    self.operation = operation
    self.dataset = context.findDataset(self.datasetName)
    self.args = {
      'url': self.dataset['url'],
      'db': self.dataset['db'],
      'collection': self.dataset['collection'],
    }

  def condition(self, condition):
    if condition == 'equal':
      self.args['condition'] = 'equal'
    elif condition == 'one':
      self.args['one'] = True

    return self

  def getConfig(self):
    return {
      'block': Database.typeToBlock[self.dataset['type']],
      'fn': self.operation,
      'extraArgs': [
        self.args
      ],
    }

query = Story(f'^query dataset {sobj}', lambda config, match, dataset: Database(dataset, 'query'))
query.register(Story('find one', lambda config, match: config.condition('one')))
query.register(Story('match state', lambda config, match: config.condition('equal')))

store = Story(f'^store (?:in)? dataset {sobj}', lambda config, match, dataset: Database(dataset, 'store'))

update = Story(f'^update dataset {sobj}', lambda config, match, dataset: Database(dataset, 'update'))
update.register(Story('one', lambda config, match: config.condition('one')))

delete = Story(f'^delete dataset {sobj}', lambda config, match, dataset: Database(dataset, 'delete'))
delete.register(Story('one', lambda config, match: config.condition('one')))

stories = [
  query,
  store,
  update,
  delete,
]
