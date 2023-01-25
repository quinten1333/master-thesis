import MSAMessaging from '../../../libs/msamessaging/index.js';

const io = new MSAMessaging();
io.register('mod', ({ input: a }, b) => a % b);

io.start();
