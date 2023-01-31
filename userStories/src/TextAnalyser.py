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

  def tokenize(self, sentence):
      tokens = [word for word in word_tokenize(sentence) if word.casefold() not in self.stop_words]
      return self.lemmatize(nltk.pos_tag(tokens))

  def tokenizeMultiSentence(self, sentences):
      return [self.tokenize(sentence) for sentence in sent_tokenize(sentences)]
