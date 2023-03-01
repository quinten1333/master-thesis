if __name__ == '__main__':
  import sys, yaml
  import src as compiler

  doc = compiler.main(sys.argv)
  with open('compiled.yml', 'w') as outFile:
    yaml.dump(doc, outFile)
