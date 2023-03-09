
import MSAMessaging, { mergeOptions } from '@amicopo/msamessaging';
import bcrypt from 'bcrypt';

export default (io: MSAMessaging) => {
  io.register('hash', ({ input }, { rounds = 12 }) => {
    return bcrypt.hash(input, rounds)
  });

  io.register('compareHash', ({ input }, args: Object) => {
    const { password, hash } = mergeOptions(input, args);

    return bcrypt.compare(password, hash);
  });
}

