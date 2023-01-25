import MSAMessaging from '../../../libs/msamessaging/index.js';

const io = new MSAMessaging();
io.register('mul', ({ input: a }, b) => a * b);

io.start();
