import re

debug = False

class Story:
  def __init__(self, regex, callback):
    if type(regex) != str:
      raise BaseException('Regex of a story should be a string!')

    self.regex = regex
    self.callback = callback
    self.stories = []

  def register(self, story):
    self.stories.append(story)

  def run(self, input, config={}):
    if type(input) != str:
      raise BaseException('Input of a story should be type string. Got: ' + str(input))
    res = re.search(self.regex, input)
    if (not res):
      return False

    try:
      config = self.callback(config, input[res.span()[0]:res.span()[1]], *res.groups())
    except BaseException as e:
      print(f'Callback of story {self.regex} failed')
      raise e
    remaining = input[res.span()[1]:]
    if (debug): print('remaining: ', remaining)

    for story in self.stories:
      res = story.run(remaining, config)
      if (debug): print(story.regex, res)
      if (not res):
        continue

    return config
