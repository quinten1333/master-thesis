if __name__ == '__main__':
  import sys, yaml
  import compiler

  doc = compiler.cli(sys.argv)
  with open('compiled.yml', 'w') as outFile:
    yaml.dump(doc, outFile)
