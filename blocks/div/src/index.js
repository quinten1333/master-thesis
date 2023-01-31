import MSAMessaging from '@amicopo/msamessaging';

const io = new MSAMessaging();
io.register('div', ({ input: a }, b) => a / b);

io.start();
