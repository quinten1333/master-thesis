# YAML file structure
The following top level keys are defined:
- name - The name of the architecture for personal reference.
- id - A unique ID to identify the architecture cross environment.
- environments - The environments that may be used in the architecture with their configuration. Further explenation below.
- datasets - The datasets that are used in the architecture. Further explenation below.
- userStories - A list of user stories. Further explenation below.


## datasets
The datasets consist of the following structure:
```yaml
datasets:
  <key>:
    type: <type>
```

### mongodb type
The MongoDB type has the keys:
- url: The url of the mongodb database
- db: The database name of the mongodb database
- collection: The name of the collection within the database

## environments
The environments section has the following structure:
```yaml
environments:
  <name>:
    managementEndpoint: <url>
    pipelineEndpoint: <url>
    endpoint: <uri>
    default: <boolean>
```

- managementEndpoint - Then url of the architecture manager 
- pipelineEndpoint - Then amqp messaging end point all services will connect to
- endpoint - Then amqp messaging end point all services will connect to for runtime communication
- default - If this architecture should be used as default when no environment is defined in a step

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
- import <path> - Imports the list of steps in another yaml file at the given path on this location. Can only be done at the root step where normaly a given would be.

#### Advanced structure
The advanced structure allows to create a specific view of the state for the function and afterwards (partially) updating the state. This allows the pipeline to remember multiple variables which opens a lot of extra possibilities.

Everywhere where a key can be submitted it is possible to create nested objects using dot notation. So `user.firstname` would be the JavaScript equivalent of `context[user][firstname]`.
This notation can also be used for arrays. `users[].firstname` would result in a list where from every object in the array `context[users]` the firstname is taken. So it would be `context[users].map((user) => user.firstname)`. This can be nested as well so `users[].contacts[].phoneNumbers` is also a valid key both for getting and setting.

The structure has the following structure:
- pre: Steps that are taken before execution to create a view from the state. If this is not present the whole state will be passed.
- do: The user story string.
- post: Steps that specify how the state should be updated. If this is not present the whole state will be overwritten with the result.
- environment: In which environment this step wil execute.

A general structure with all options shown is:
```yaml
pre:
  pick: <key>
  select:
  - <key> [as <differentName>]
do: <user story>
post:
  set: <key>
  upsert:
  - <key> [as <differentName>]
  unset:
  - <key>
environment: <name>
```

##### pre
The only pre operation currently is the select operation. This selects items from the state and allows the renaming of them.

It is possible to create objects inline using dots, for example `<key> as <level1>.<level2>.<finalKey>`.

##### post
There are three post operations:
- set: This assigns the output of the function to the supplied key.
- upsert: Update or insert the given keys from the output dictionary in the state, optionally renaming them. Or upserting hardcoded values into the state. This could be used to initialize arrays before filling them.
- unset: Remove variables from the state which are no longer needed after that step.

## Complete example
```yaml
name: <name>
id: <id>
datasets:
  <key>:
    type: <type>
    typeSpecificConfig...:
environments:
  <name>:
    managementEndpoint: <url>
    pipelineEndpoint: <url>
    endpoint: <uri>
    default: <boolean>
  ...:
userStories:
- given: <user story>
  then:
  - pre:
      pick: <key>
      select:
      - <key> [as <differentName>]
    do: <user story>
    post:
      set: <key>
      upsert:
      - <key> [as <differentName>]
      unset:
      - <key>
    environment: <name>
  - ...
- ...
```