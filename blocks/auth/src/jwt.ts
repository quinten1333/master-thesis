import MSAMessaging, { mergeOptions, cleanDict } from '@amicopo/msamessaging';
import jwt from 'jsonwebtoken';

export default (io: MSAMessaging) => {
  type CreateJWTOptions = {
    payload: Object
    secret: string
    secretEncoding: 'utf8' | 'base64'
    algorithm: jwt.Algorithm
    expiresIn: string | number
    issuer: string
    notBefore: string | number
    subject: string
  }

  io.register('createJWT', ({ input }, args: any) => {
    const { payload, secret, secretEncoding, algorithm, expiresIn, issuer, notBefore, subject }: CreateJWTOptions = mergeOptions(input, args)

    return jwt.sign(payload, Buffer.from(secret, secretEncoding), cleanDict({
      algorithm,
      expiresIn,
      issuer,
      notBefore,
      subject,
    }))
  });

  type ValidateJWTOptions = {
    token: string
    secret: string
    secretEncoding: 'utf8' | 'base64'
    algorithms: [jwt.Algorithm]
  }

  io.register('validateJWT', ({ input }, args: Object) => {
    const { token, secret, secretEncoding, algorithms }: ValidateJWTOptions = mergeOptions(input, args);

    return jwt.verify(token, Buffer.from(secret, secretEncoding), {
      algorithms
    });
  });
}

