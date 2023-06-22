from ..Story import Story, resolveIdentifierOrObj, sobj

def toJSVar(input):
    res = resolveIdentifierOrObj(input)
    if res['type'] == 'identifier':
      return f'context.{res["value"]}'
    elif res['type'] == 'keyword':
        return res['value']

    return res["value"]

def genCompareFunction(a, op, b):
    return f'(context) => {toJSVar(a)} {op} {toJSVar(b)}'

stories = [
  Story(f'(.+) not equal (.+)', lambda config, match, a, b: { 'fn': genCompareFunction(a, '!==', b) }),
  Story(f'(.+) equal (.+)', lambda config, match, a, b: { 'fn': genCompareFunction(a, '===', b) }),
  Story(f'(.+) not in (.+)', lambda config, match, a, b: { 'fn': f'(context) => !{toJSVar(b)}.includes({toJSVar(a)})' }),
  Story(f'(.+) in (.+)', lambda config, match, a, b: { 'fn': f'(context) => {toJSVar(b)}.includes({toJSVar(a)})' }),
  Story(f'fn {sobj}', lambda config, match, fn: { 'fn': fn }),
]
