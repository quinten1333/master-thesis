from ..Story import Story, sobj, iobj, objParse, GenericConfig

class Gateway:
  def __init__(self, path, port, method):
    self.config = { 'block': 'gateway', 'fn': 'listen', 'extraArgs': [{ 'port': port, 'routes': [ { 'method': method or 'get', 'path': path, 'params': {} } ] }]}

  def prepareParam(self, param):
    if param not in self.config['extraArgs'][0]['routes'][0]['params']:
      self.config['extraArgs'][0]['routes'][0]['params'][param] = {}

  def paramOfType(self, param, type, optional):
    self.prepareParam(param)

    if 'type' in self.config['extraArgs'][0]['routes'][0]['params'][param]:
      print(f'Warning: Overwriting already set type for param {param}')

    self.config['extraArgs'][0]['routes'][0]['params'][param]['type'] = type
    self.config['extraArgs'][0]['routes'][0]['params'][param]['optional'] = optional

    return self


  def getConfig(self):
    return self.config

request = Story(f'^http (get|post|put|patch|delete)? ?request path {sobj} port {iobj} ', lambda config, match, method, path, port: Gateway(path, objParse(port), method))
request.register(Story(f'(?: and )?( optional )?parameter {sobj} of type {sobj}', lambda config, match, optional, param, type: config.paramOfType(param, type, bool(optional))))

respond = Story(f'^respond http request port {iobj}', lambda config, match, port: GenericConfig('gateway', 'reply', { 'port': port })) #TODO: Remove the need to supply the port using the context
respond.register(Story(f'status {iobj}', lambda config, match, statusCode: config.set('status', objParse(statusCode))))

stories = [
  request,
  respond,
]
