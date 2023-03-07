from .exceptions import *

class Doc:
  def set(self, doc):
    self.doc = doc

  def get(self):
    return self.doc

  @property
  def name(self):
    return self.doc['name']

  @property
  def endpoint(self):
    return self.doc['endpoint']

  @property
  def datasets(self):
    return self.doc['datasets']

  @property
  def userStories(self):
    return self.doc['userStories']

  def findDataset(self, name):
    dataset = self.datasets[name]
    if not dataset:
      raise CompileError(f'Dataset with name {name} not found!')

    return dataset

context = Doc()
