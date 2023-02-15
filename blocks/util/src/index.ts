import MSAMessaging from '@amicopo/msamessaging';

const io = new MSAMessaging();

// Number
io.register('div', ({ input: a }, b) => a / b);
io.register('min', ({ input: a }, b) => a - b);
io.register('mod', ({ input: a }, b) => a % b);
io.register('mul', ({ input: a }, b) => a * b);
io.register('plus', ({ input: a }, b) => a + b);

// Dict
io.register('unpack', ({ input }, key) => input[key]);
io.register('pack', ({ input }, key) => ({ [key]: input }));

// Array
io.register('select', ({ input }, i) => input[i]);

io.start();