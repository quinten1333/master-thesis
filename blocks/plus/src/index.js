import MSAMessaging from '../../../libs/msamessaging/index.js';

const io = new MSAMessaging();
io.register('plus', ({ input: a }, b) => a + b);

io.start();
