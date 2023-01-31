import MSAMessaging from '@amicopo/msamessaging';

const io = new MSAMessaging();
io.register('mul', ({ input: a }, b) => a * b);

io.start();
