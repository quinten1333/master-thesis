from ..Story import Story, resolveIdentifierOrObj

def genCompareFunction(a, op, b):
    def toJSVar(input):
        res = resolveIdentifierOrObj(input)
        if res['type'] == 'identifier':
          return f'context.{res["value"]}'
        elif res['type'] == 'keyword':
           return res['value']

        return res["value"]

    return f'(context) => {toJSVar(a)} {op} {toJSVar(b)}'

stories = [
  Story(f'(.+) not equal (.+)', lambda config, match, a, b: { 'fn': genCompareFunction(a, '!==', b) }),
  Story(f'(.+) equal (.+)', lambda config, match, a, b: { 'fn': genCompareFunction(a, '===', b) }),
]
