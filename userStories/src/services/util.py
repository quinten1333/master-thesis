from Story import Story

stories = [
  Story('^devide', lambda config, match: ({ 'block': 'util', 'fn': 'div', 'extraArgs': [ ] })),
  Story('^minus', lambda config, match: ({ 'block': 'util', 'fn': 'min', 'extraArgs': [ ] })),
  Story('^modulo', lambda config, match: ({ 'block': 'util', 'fn': 'mod', 'extraArgs': [ ] })),
  Story('^time', lambda config, match: ({ 'block': 'util', 'fn': 'mul', 'extraArgs': [ ] })),
  Story('^plus', lambda config, match: ({ 'block': 'util', 'fn': 'plus', 'extraArgs': [ ] })),

  Story('^unpack "(\w+)"', lambda config, match, key: ({ 'block': 'util', 'fn': 'unpack', 'extraArgs': [ key ] })),
  Story('^pack "(\w+)"', lambda config, match, key: ({ 'block': 'util', 'fn': 'pack', 'extraArgs': [ key ] })),

  Story('^set state "(.+)"', lambda config, match, value: ({ 'block': 'util', 'fn': 'set', 'extraArgs': [ value ] })),
  Story('^set state (\d+)', lambda config, match, value: ({ 'block': 'util', 'fn': 'set', 'extraArgs': [ int(value) ] })),
  Story('^log state', lambda config, match: ({ 'block': 'util', 'fn': 'log', 'extraArgs': [ ] })),
]
