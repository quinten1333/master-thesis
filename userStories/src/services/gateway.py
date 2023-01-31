from ..Story import Story

class Gateway:
  def __init__(self, port, method):
    self.config = { 'block': 'gateway', 'fn': 'listen', 'extraArgs': [{ 'port': port, 'method': method }]}

  def prepareParam(self, param):
    if 'params' not in self.config['extraArgs'][0]:
      self.config['extraArgs'][0]['params'] = {}

    if param not in self.config['extraArgs'][0]['params']:
      self.config['extraArgs'][0]['params'][param] = {}

  def paramOfType(self, param, type):
    self.prepareParam(param)

    if 'type' in self.config['extraArgs'][0]['params'][param]:
      print(f'Warning: Overwriting already set type for param {param}')

    self.config['extraArgs'][0]['params'][param]['type'] = type

    return self


  def getConfig(self):
    return self.config

# TODO: Make method optional
story = Story('^http (get|post|put|patch|delete) request port (\d+)', lambda config, match, method, port: Gateway(port, method))
story.register(Story('parameter "(.*?)" of type "(.*?)"', lambda config, match, param, type: config.paramOfType(param, type)))
# story.register(Story('parameter "(.*?)" (equal|not equal) "(.*?)"', lambda config, match, param, cond, value: config.paramCondition(param, cond, value)))

