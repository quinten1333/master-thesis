import re

debug = False

class Story:
  def __init__(self, regex, callback):
    self.regex = regex
    self.callback = callback
    self.stories = []

  def register(self, story):
    self.stories.append(story)

  def run(self, input, config={}):
    res = re.search(self.regex, input)
    if (not res):
      return False

    config = self.callback(config, input[res.span()[0]:res.span()[1]], *res.groups())
    remaining = input[res.span()[1]:]
    if (debug): print('remaining: ', remaining)

    for story in self.stories:
      res = story.run(remaining, config)
      if (debug): print(story.regex, res)
      if (not res):
        continue

    return config
