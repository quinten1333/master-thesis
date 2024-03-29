from pathlib import Path
import importlib

from ..exceptions import *

class StoryManager:
  def __init__(self):
    self.stories = []

  def registerStories(self, stories: list) -> None:
    self.stories.extend(stories)

  def loadDir(self, dirName: str) -> None:
    root = Path(__file__).parent.resolve(True)
    dir = root / dirName
    for fPath in dir.iterdir():
      if not fPath.is_file(): continue
      if not fPath.name.endswith('.py'): continue

      name = fPath.name[:-3]
      mod = importlib.import_module(f'.{dirName}.{name}', __package__)
      if not isinstance(mod.stories, list):
        raise BaseException(f'Error: .{dirName}.{name} does not define a stories array')

      self.registerStories(mod.stories)

  def findMatchingStory(self, inputStory: str):
    for story in self.stories:
      conf = story.run(inputStory)
      if conf:
        if type(conf) != dict:
          return conf.getConfig()
        return conf

    raise ParseError(f'Sentence "{inputStory}" could not be matched with a story')
