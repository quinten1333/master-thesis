import sys
from TextAnalyser import TextAnalyser

from services.gateway import story as gatewayStory

stories = [gatewayStory]

if __name__ == "__main__":
  if len(sys.argv) < 2:
    print('Please give input', file=sys.stderr)
    sys.exit(1)

  input = sys.argv[1]
  textAnalyser = TextAnalyser()
  tokens = textAnalyser.tokenize(input)
  analysedInput = tokens.join(' ') # 'http get request port 3000 parameter "input" of type "numeric"'

  for story in stories:
    conf = story.run(analysedInput)
    if conf:
      break

  if conf:
    print(conf.getConfig())
  else:
    print('User story could not be matched with a block')

