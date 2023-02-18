from Story import Story

stories = [
  Story('^devide (\d+)', lambda config, match, value: ({ 'block': 'util', 'fn': 'div', 'extraArgs': [ float(value) ] })),
  Story('^minus (\d+)', lambda config, match, value: ({ 'block': 'util', 'fn': 'min', 'extraArgs': [ float(value) ] })),
  Story('^modulo (\d+)', lambda config, match, value: ({ 'block': 'util', 'fn': 'mod', 'extraArgs': [ float(value) ] })),
  Story('^time (\d+)', lambda config, match, value: ({ 'block': 'util', 'fn': 'mul', 'extraArgs': [ float(value) ] })),
  Story('^plus (\d+)', lambda config, match, value: ({ 'block': 'util', 'fn': 'plus', 'extraArgs': [ float(value) ] })),

  Story("^unpack `` (\w+) ''", lambda config, match, key: ({ 'block': 'util', 'fn': 'unpack', 'extraArgs': [ key ] })),
  Story("^pack `` (\w+) ''", lambda config, match, key: ({ 'block': 'util', 'fn': 'pack', 'extraArgs': [ key ] })),
  Story("^log state", lambda config, match: ({ 'block': 'util', 'fn': 'log', 'extraArgs': [ ] })),
]
