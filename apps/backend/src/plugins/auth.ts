import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import jwt, { FastifyJWT } from '@fastify/jwt';

export default fp(async (fastify: FastifyInstance) => {
  fastify.register(jwt, {
    secret: fastify.config.JWT_SECRET,
    sign: {
      expiresIn: fastify.config.JWT_ACCESS_EXPIRY,
    },
    cookie: {
      cookieName: 'accessToken',
      signed: true,
    },
  });

  fastify.decorate('generateTokens', (payload: { userId: string; email: string; companyId: string }) => {
    const accessToken = fastify.jwt.sign(
      { ...payload, type: 'access' },
      { expiresIn: fastify.config.JWT_ACCESS_EXPIRY }
    );

    const refreshToken = fastify.jwt.sign(
      { ...payload, type: 'refresh' },
      { expiresIn: fastify.config.JWT_REFRESH_EXPIRY }
    );

    return { accessToken, refreshToken };
  });
});

declare module 'fastify' {
  interface FastifyInstance {
    generateTokens: (payload: {
      userId: string;
      email: string;
      companyId: string;
    }) => {
      accessToken: string;
      refreshToken: string;
    };
  }
}
