import Pipelinemessaging from '@amicopo/pipelinemessaging';
import jwtRegister from './jwt.js';
import bcryptRegister from './bcrypt.js';

const io = new Pipelinemessaging();

jwtRegister(io);
bcryptRegister(io);

io.start();
