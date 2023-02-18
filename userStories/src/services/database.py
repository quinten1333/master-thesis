from Story import Story
from Context import context

class Query:
  typeToBlock = {
    'mongodb': 'mongodb'
  }

  def __init__(self, datasetName):
    self.datasetName = datasetName
    self.dataset = context.findDataset(self.datasetName)
    self.args = {
      'url': self.dataset['url'],
      'db': self.dataset['db'],
      'collection': self.dataset['collection'],
    }

  def condition(self, condition):
    if condition == 'equal':
      self.args['condition'] = 'equal'
    if condition == 'one':
      self.args['one'] = True

    return self

  def getConfig(self):
    return {
      'block': Query.typeToBlock[self.dataset['type']],
      'fn': 'query',
      'extraArgs': [
        self.args
      ],
    }

query = Story("^query dataset `` (.+) '' ", lambda config, match, dataset: Query(dataset))
query.register(Story('^find one ', lambda config, match: config.condition('one')))
query.register(Story('^match state', lambda config, match: config.condition('equal')))

stories = [
  query,
]
