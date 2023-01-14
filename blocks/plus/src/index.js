import MSAMessaging from '../../../libs/msamessaging/index.js';

const io = new MSAMessaging();
io.register('plus', (a, _, b) => a + b);

io.start();
