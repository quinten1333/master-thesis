from Story import Story, sobj, iobj, objParse

class Gateway:
  def __init__(self, path, port, method):
    self.config = { 'block': 'gateway', 'fn': 'listen', 'extraArgs': [{ 'port': port, 'routes': [ { 'method': method, 'path': path, 'params': {} } ] }]}

  def prepareParam(self, param):
    if param not in self.config['extraArgs'][0]['routes'][0]['params']:
      self.config['extraArgs'][0]['routes'][0]['params'][param] = {}

  def paramOfType(self, param, type):
    self.prepareParam(param)

    if 'type' in self.config['extraArgs'][0]['routes'][0]['params'][param]:
      print(f'Warning: Overwriting already set type for param {param}')

    self.config['extraArgs'][0]['routes'][0]['params'][param]['type'] = type

    return self


  def getConfig(self):
    return self.config

# TODO: Make method optional
gatewayConf = Story(f'^http (get|post|put|patch|delete)? request path {sobj} port {iobj} ', lambda config, match, method, path, port: Gateway(path, objParse(port), method))
gatewayConf.register(Story(f'(?: and )?parameter {sobj} of type {sobj}', lambda config, match, param, type: config.paramOfType(param, type)))

stories = [
  gatewayConf,
  Story("^respond http request port (\d+)", lambda config, match, port: { 'block': 'gateway', 'fn': 'reply', 'extraArgs': [{ 'port': port }] }), #TODO: Remove the need to supply the port using the context
]
