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
io.register('shift', ({ input }: { input: Array<any> }) => input.shift())
io.register('pop', ({ input }: { input: Array<any> }) => input.pop())
io.register('push', ({ input }: { input: { array: Array<any>, value: any }}) => { input.array.push(input.value); return input.array; })
io.register('sum', ({ input }: { input: Array<number> }) => input.reduce((sum, cur) => sum + cur, 0))
io.register('avg', ({ input }: { input: Array<number> }) => input.reduce((sum, cur) => sum + cur, 0) / input.length)

// State
io.register('set', (_, value) => value)

// JSON
io.register('jsonParse', ({ input }) => JSON.parse(input));
io.register('jsonStringify', ({ input }) => JSON.stringify(input));

// Debugging
io.register('log', ({ input }) => {
  console.log('type:', typeof input, 'value:', input);
  return input;
})

io.start();
