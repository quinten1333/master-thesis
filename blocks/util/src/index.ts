import Pipelinemessaging from '@amicopo/pipelinemessaging';

const io = new Pipelinemessaging();

// Number
io.register('div', ({ input: { a, b } }) => a / b);
io.register('min', ({ input: { a, b } }) => a - b);
io.register('mod', ({ input: { a, b } }) => a % b);
io.register('mul', ({ input: { a, b } }) => a * b);
io.register('plus', ({ input: { a, b } }) => a + b);

// Dict
io.register('unpack', ({ input }, key) => input[key]);
io.register('pack', ({ input }, key) => ({ [key]: input }));

// Array
io.register('select', ({ input }, i) => input[i]);

// State
io.register('set', (_, value) => value)

// Debugging
io.register('log', ({ input }) => {
  console.log(input);
  return input;
})

io.start();
