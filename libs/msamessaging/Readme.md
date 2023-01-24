# Example config
```js
const exampleConfigPlus = [ // x + 2 - 10
  {
    endpoint: 'amqp://rabbitmq',
    queues: {
      plusCalculation: {
        steps: {
          0: {
            fnName: 'plus',
            extraArgs: [2],
            outId: 0,
            outQueue: 'minCalculation'
          },
        }
      }
    }
  }
]

const exampleConfigMin = [ // x + 2 - 10
  {
    endpoint: 'amqp://rabbitmq',
    queues: {
      minCalculation: {
        steps: {
          1: {
            fnName: 'min',
            extraArgs: [10],
            outId: 0,
            outQueue: '!gateway'
          },
        }
      }
    }
  }
]

const exampleConfigGateway = [
  {
    endpoint: 'amqp://rabbitmq',
    queues: {
      '!gateway': {
        steps: {
          2: {
            fnName: 'reply',
          }
        }
      }
    }
  }
]

const exampleReplyGateway = [
  {
    endpoint: 'amqp://rabbitmq',
    queues: {
      '!gateway': {
        steps: {
          0: {
            fnName: 'identity',
            extraArgs: [],
            outId: 0,
            outQueue: '!gateway'
          },
          1: {
            fnName: 'reply',
            extraArgs: [],
          },
        }
      }
    }
  }
];
```

# Example data being send between everyone
```js
const exampleData = {
  reqId: 0,
  step: 1,
  input: 10, // Whatever type of object
}
```
