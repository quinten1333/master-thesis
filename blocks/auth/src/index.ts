import MSAMessaging from '@amicopo/msamessaging';
import jwtRegister from './jwt.js';
import bcryptRegister from './bcrypt.js';

const io = new MSAMessaging();

jwtRegister(io);
bcryptRegister(io);

io.start();
