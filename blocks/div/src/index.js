import MSAMessaging from '../../../libs/msamessaging/index.js';

const io = new MSAMessaging();
io.register('div', (a, _, b) => a / b);

io.start();
