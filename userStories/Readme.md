# YAML file structure
The following top level keys are defined:
- name: The name of the architecture for personal reference
- endpoint - Then amqp messaging end point all services will connect to
- datasets - The datasets that are used in the architecture. Further explenation below.
- userStories - A list of user stories. Further explenation below.


## datasets
The datasets consist of the following structure:
```yaml
<key>:
  type: <type>
```

### mongodb type
The MongoDB type has the keys:
- url: The url of the mongodb database
- db: The database name of the mongodb database
- collection: The name of the collection within the database

## userStories
```yaml
given: <string which generates input>
then: <list of steps>
```

### step structure
There are two ways of defining. Using simple text and using a more complex structure with advanced capabilities.

#### Simple structure
The simple structure allows the user to directly enter the user story text or keyword. The simple structure is the only way to define keywords, since the advanced features are not relevent for keywords.

##### Keywords
- stop - Stops the execution of the pipeline here
- goto <int> - Go to step number `int` of the pipeline

#### Advanced structure
The advanced structure allows to create a specific view of the state for the function and afterwards (partially) updating the state. This allows the pipeline to remember multiple variables which opens a lot of extra possibilities.

The structure has the following keys:
- pre: Steps that are taken before execution to create a view from the state. If this is not present the whole state will be passed.
- do: The user story string
- post: Steps that specify how the state should be updated. If this is not present the whole state will be overwritten with the result.

A general structure with all options shown is:
```yaml
pre:
  select:
  - <key> [as <differentName>]
do: <user story>
post:
  set: <key>
  unset:
  - <key>
  upsert:
  - <key> [as <differentName>]
```

##### pre
The only pre operation currently is the select operation. This selects items from the state and allows the renaming of them.

It is possible to create objects inline using dots, for example `<key> as <level1>.<level2>.<finalKey>`.

##### post
There are three post operations:
- set: This assigns the output of the function to the supplied key.
- upsert: Update or insert the given keys from the output dictionary in the state, optionally renaming them.
- unset: Remove variables from the state which are no longer needed after that step.
