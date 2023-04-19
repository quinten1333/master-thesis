
import Pipelinemessaging, { mergeOptions } from '@amicopo/pipelinemessaging';
import bcrypt from 'bcrypt';

export default (io: Pipelinemessaging) => {
  io.register('hash', ({ input }, { rounds = 12 }) => {
    return bcrypt.hash(input, rounds)
  });

  io.register('compareHash', ({ input }, args: Object) => {
    const { password, hash } = mergeOptions(input, args);

    return bcrypt.compare(password, hash);
  });
}

