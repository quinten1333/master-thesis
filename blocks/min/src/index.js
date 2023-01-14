import MSAMessaging from '../../../libs/msamessaging/index.js';

const io = new MSAMessaging();
io.register('min', (a, _, b) => a - b);

io.start();
