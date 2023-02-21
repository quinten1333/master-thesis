import re
from ..Story import Story, resolveIdentifierOrObj

stories = [
  Story(f'(.+) equal (.+)', lambda config, match, a, b: { 'a': resolveIdentifierOrObj(a), 'b': resolveIdentifierOrObj(b) }), # TODO: Make js function here
]
