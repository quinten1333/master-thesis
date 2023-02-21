import nltk
from nltk.tokenize import sent_tokenize, word_tokenize
from nltk.corpus import stopwords, wordnet
from nltk.stem import WordNetLemmatizer
from collections import defaultdict


# nltk.download("stopwords")
# nltk.download("punkt")
# nltk.download("averaged_perceptron_tagger")
# nltk.download("tagsets")
# nltk.download('wordnet')
# nltk.download('omw-1.4')

class TextAnalyser:
  def __init__(self):
    self.stop_words = set(stopwords.words("english"))
    self.stop_words.remove('of')
    self.stop_words.remove('and')

    self.lemmatizer = WordNetLemmatizer()
    self.tag_map = defaultdict(lambda: wordnet.NOUN)
    self.tag_map['J'] = wordnet.ADJ # TODO: Is deze tag map af?
    self.tag_map['V'] = wordnet.VERB
    self.tag_map['R'] = wordnet.ADV


  def lemmatize(self, tokens):
    return [(self.lemmatizer.lemmatize(token[0], pos=self.tag_map[token[1]]), token[1]) for token in tokens]

  def word_tokenize(self, sentence): # ` is JSON? And " is thus actually a shortcut for `"..."`?
    def findQuoted(sentence, open, close):
      if sentence[0] != open:
        return None

      end = sentence.find(close, 1)
      while end != len(sentence) - 1 and sentence[end + 1] != ' ': # Make sure the close has a space behind it and handle end of sentence properly
        end = sentence.find(close, end + 1)

      return sentence[0:end + 1]

    tokens = []
    while sentence:
      res = findQuoted(sentence, '`', '`')
      if res:
        tokens.append(res)
        sentence = sentence[len(res) + 1:]
        continue

      res = findQuoted(sentence, '"', '"')
      if res:
        tokens.append('`' + res + '`')
        sentence = sentence[len(res) + 1:]
        continue

      id = sentence.find(' ')
      if id < 0:
        id = len(sentence)

      tokens.append(sentence[0:id])
      sentence = sentence[id + 1:]

    return tokens

  def tokenize(self, sentence, tagged=False):
    tokens = [word for word in self.word_tokenize(sentence) if word[0] == '`' or word.casefold() not in self.stop_words]
    tokens = self.lemmatize(nltk.pos_tag(tokens))
    if not tagged:
        tokens = [token[0] for token in tokens]

    return tokens

  def tokenizeMultiSentence(self, sentences):
    return [self.tokenize(sentence) for sentence in sent_tokenize(sentences)]


textAnalyser = TextAnalyser()

def tokenizeStory(userStory):
  def _tokenizeStep(step):
    if 'op' in step: # Ignore op steps
      return step

    if 'condition' in step:
      return tokenizeStory(step)

    return {
      **step,
      'do': ' '.join(textAnalyser.tokenize(step['do'])),
    }

  return {
    'condition': _tokenizeStep(userStory['condition']),
    'steps': [*map(_tokenizeStep, userStory['steps'])],
  }
