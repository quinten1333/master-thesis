import MSAMessaging from '@amicopo/msamessaging';
import jwtRegister from './jwt.js';

const io = new MSAMessaging();

jwtRegister(io);

io.start();
