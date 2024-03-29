from ..Story import Story, sobj, obj, objParse

stories = [
  Story('^devide', lambda config, match: ({ 'block': 'util', 'fn': 'div', 'extraArgs': [ ] })),
  Story('^minus', lambda config, match: ({ 'block': 'util', 'fn': 'min', 'extraArgs': [ ] })),
  Story('^modulo', lambda config, match: ({ 'block': 'util', 'fn': 'mod', 'extraArgs': [ ] })),
  Story('^time', lambda config, match: ({ 'block': 'util', 'fn': 'mul', 'extraArgs': [ ] })),
  Story('^plus', lambda config, match: ({ 'block': 'util', 'fn': 'plus', 'extraArgs': [ ] })),

  Story(f'^unpack {sobj}', lambda config, match, key: ({ 'block': 'util', 'fn': 'unpack', 'extraArgs': [ key ] })),
  Story(f'^pack {sobj}', lambda config, match, key: ({ 'block': 'util', 'fn': 'pack', 'extraArgs': [ key ] })),
  Story(f'^pop array', lambda config, match: ({ 'block': 'util', 'fn': 'pop', 'extraArgs': [ ] })),
  Story(f'^shift array', lambda config, match: ({ 'block': 'util', 'fn': 'shift', 'extraArgs': [ ] })),
  Story(f'^push array', lambda config, match: ({ 'block': 'util', 'fn': 'push', 'extraArgs': [ ] })),
  Story(f'^sum', lambda config, match: ({ 'block': 'util', 'fn': 'sum', 'extraArgs': [ ] })),
  Story(f'^average', lambda config, match: ({ 'block': 'util', 'fn': 'avg', 'extraArgs': [ ] })),

  Story(f'^set state {obj}', lambda config, match, value: ({ 'block': 'util', 'fn': 'set', 'extraArgs': [ objParse(value) ] })),
  Story('^log state', lambda config, match: ({ 'block': 'util', 'fn': 'log', 'extraArgs': [ ] })),

  Story('^JSON parse', lambda config, match: ({ 'block': 'util', 'fn': 'jsonParse', 'extraArgs': [ ] })),
  Story('^JSON stringify', lambda config, match: ({ 'block': 'util', 'fn': 'jsonStringify', 'extraArgs': [ ] })),
]
