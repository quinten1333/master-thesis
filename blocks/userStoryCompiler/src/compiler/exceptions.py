class CompilerError(BaseException):
  pass

class InputError(CompilerError):
  pass

class ParseError(CompilerError):
  pass

class CompileError(CompilerError):
  pass

