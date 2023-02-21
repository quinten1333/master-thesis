import re
import json

debug = False

sobj = '`"([^`]*)"`'
iobj = '(\d+)'
obj = '`([^`]*)`'
def objParse(obj):
  return json.loads(obj)

class Story:
  def __init__(self, regex, callback):
    if type(regex) != str:
      raise BaseException('Regex of a story should be a string!')

    self.regexRaw = regex
    self.regex = re.compile(regex)
    self.callback = callback
    self.stories = []

  def register(self, story):
    self.stories.append(story)

  def _run(self, input, config={}):
    if type(input) != str:
      raise BaseException('Input of a story should be type string. Got: ' + str(input))
    res = self.regex.search(input)
    if (not res):
      return False

    try:
      config = self.callback(config, input[res.span()[0]:res.span()[1]], *res.groups())
    except BaseException as e:
      print(f'Callback of story {self.regexRaw} failed')
      raise e
    remaining = input[res.span()[1]:]
    if (debug): print('remaining: ', remaining)

    found = False
    while remaining:
      for story in self.stories:
        res = story._run(remaining, config)
        if not res:
          continue

        config, remaining = res
        if (debug): print(story.regexRaw, config)
        found = True

      if not found:
        break

    return config, remaining

  def run(self, input):
    res = self._run(input)
    if not res:
      return res
    conf, remaining = res

    if remaining:
      raise BaseException(f'Could not parse complete story.\nInput: "{input}"\nRemaining:"{remaining}"')

    return conf
