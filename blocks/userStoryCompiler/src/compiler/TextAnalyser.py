import torch
from transformers import BertTokenizer, BertModel
from scipy.spatial.distance import cosine
# from nltk.corpus import stopwords

from .exceptions import *

class TextAnalyser:
  def __init__(self):
    # self.stop_words = set(stopwords.words("english"))
    # self.stop_words.remove('of')
    # self.stop_words.remove('and')
    # self.stop_words.remove('not')

    self.tokenizer = BertTokenizer.from_pretrained('bert-base-uncased')
    self.model = BertModel.from_pretrained('bert-base-uncased',output_hidden_states = True,)
    self.model.eval() # Evaluation mode

  def get_embeddings(self, text):
    text = '[CLS] ' + text + ' [SEP]'
    # Split the sentence into tokens.
    tokenized_text = self.tokenizer.tokenize(text)

    # Map the token strings to their vocabulary indeces.
    indexed_tokens = self.tokenizer.convert_tokens_to_ids(tokenized_text)
    segments_ids = [1] * len(tokenized_text)
    # Convert inputs to PyTorch tensors
    tokens_tensor = torch.tensor([indexed_tokens])
    segments_tensors = torch.tensor([segments_ids])

    # Run the text through BERT, and collect all of the hidden states produced
    # from all 12 layers.
    with torch.no_grad():

        outputs = self.model(tokens_tensor, segments_tensors)

        # Evaluating the model will return a different number of objects based on
        # how it's  configured in the `from_pretrained` call earlier. In this case,
        # becase we set `output_hidden_states = True`, the third item will be the
        # hidden states from all layers. See the documentation for more details:
        # https://huggingface.co/transformers/model_doc/bert.html#bertmodel
        hidden_states = outputs[2]

    return (tokenized_text, hidden_states)

  def get_token_embeddings(self, hidden_states):
    # Concatenate the tensors for all layers. We use `stack` here to
    # create a new dimension in the tensor.
    token_embeddings = torch.stack(hidden_states, dim=0)

    # Remove dimension 1, the "batches".
    token_embeddings = torch.squeeze(token_embeddings, dim=1)

    # Swap dimensions 0 and 1.
    token_embeddings = token_embeddings.permute(1,0,2)
    # contains: Tokens, layers, features

    return token_embeddings

  def vectorize_tokens(self, embeddings, method='cat'):
    # Stores the token vectors, with shape [22 x 3,072] for cat or [22 x 768] for sum
    token_vecs = []

    # `embeddings` is a [22 x 12 x 768] tensor.

    for token in embeddings:
      # `token` is a [12 x 768] tensor

      if method == 'cat':
        # Concatenate the vectors (that is, append them together) from the last
        # four layers.
        # Each layer vector is 768 values, so `cat_vec` is length 3,072.
        vec = torch.cat((token[-1], token[-2], token[-3], token[-4]), dim=0)
      elif method == 'catMiddle':
        vec = torch.cat((token[-2], token[-3], token[-4], token[-5], token[-6], token[-7], token[-8], token[-9], token[-10]), dim=0)
      elif method == 'sum':
        # Sum the vectors from the last four layers.
        vec = torch.sum(token[-4:], dim=0)
      else:
        raise BaseException('Unkown method')

      token_vecs.append(vec)
    return token_vecs

  def vectorize_sentence(self, hidden_states):
    # `hidden_states` has shape [13 x 1 x 22 x 768]

    # `token_vecs` is a tensor with shape [22 x 768]
    token_vecs = hidden_states[-2][0]

    # Calculate the average of all 22 token vectors.
    sentence_embedding = torch.mean(token_vecs, dim=0)
    return sentence_embedding
    # print ("Our final sentence embedding vector of shape:", sentence_embedding.size())

  def tokenize_vars(self, sentence): # ` is JSON? And " is thus actually a shortcut for `"..."`?
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

  # def tokenize(self, sentence, tagged=False):
  #   tokens = [word for word in self.word_tokenize(sentence) if word[0] == '`' or word.casefold() not in self.stop_words]
  #   tokens = self.lemmatize(nltk.pos_tag(tokens))
  #   if not tagged:
  #       tokens = [token[0] for token in tokens]

  #   return tokens

  def embedCommand(self, text):
    tokens, hidden_layers = self.get_embeddings(text)
    embeddings = self.vectorize_tokens(self.get_token_embeddings(hidden_layers))

    tokens = tokens[1:-1]
    embeddings = embeddings[1:-1]

    return {
      'do': ' '.join(tokens)
    }

  def embedPre(self, text):
    return text

  def embedPost(self, text):
    return text

  def embedMultiSentence(self, text):
    sentences = text.split(';')
    if len(sentences) > 3:
      raise InputError('More than 3 sentences were supplied as an action.')

    # TODO: Detect using embeddings.
    if len(sentences) == 1:
      command = sentences[0]
    if len(sentences) == 2:
      pre, command = sentences
    if len(sentences) == 3:
      pre, command, post = sentences


    res = {
      'do': self.embedCommand(command)
    }

    if pre:
      res['pre'] = self.embedPre(pre)
    if post:
      res['post'] = self.embedCommand(post)

    return res


textAnalyser = TextAnalyser()

def tokenizeStory(userStory):
  def _tokenizeStep(step):
    if type(step) == str:
      return textAnalyser.embedMultiSentence(step)

    if 'op' in step: # Ignore op steps
      return step

    if 'condition' in step:
      return tokenizeStory(step)

    return {
      **step,
      'do': textAnalyser.embedCommand(step['do']),
    }

  return {
    'condition': _tokenizeStep(userStory['condition']),
    'steps': [*map(_tokenizeStep, userStory['steps'])],
  }
