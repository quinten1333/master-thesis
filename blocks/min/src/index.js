import MSAMessaging from '@amicopo/msamessaging';

const io = new MSAMessaging();
io.register('min', ({ input: a }, b) => a - b);

io.start();
