import MSAMessaging from '@amicopo/msamessaging';

const io = new MSAMessaging();
io.register('plus', ({ input: a }, b) => a + b);

io.start();
