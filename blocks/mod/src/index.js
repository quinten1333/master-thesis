import MSAMessaging from '@amicopo/msamessaging';

const io = new MSAMessaging();
io.register('mod', ({ input: a }, b) => a % b);

io.start();
