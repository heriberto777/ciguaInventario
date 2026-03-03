import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import jwt, { FastifyJWT } from '@fastify/jwt';

export default fp(async (fastify: FastifyInstance) => {
  fastify.register(jwt, {
    secret: fastify.config.JWT_SECRET,
    sign: {
      expiresIn: fastify.config.JWT_ACCESS_EXPIRY,
    },
  });

  fastify.decorate('generateTokens', (payload: {
    userId: string;
    email: string;
    companyId: string;
    sessionId?: string;
    roles?: string[];
    permissions?: string[];
  }) => {
    const accessToken = fastify.jwt.sign(
      { ...payload, id: payload.userId, type: 'access' },
      { expiresIn: fastify.config.JWT_ACCESS_EXPIRY }
    );

    const refreshToken = fastify.jwt.sign(
      { ...payload, id: payload.userId, type: 'refresh' },
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
      sessionId?: string;
      roles?: string[];
      permissions?: string[];
    }) => {
      accessToken: string;
      refreshToken: string;
    };
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      userId: string;
      id: string; // Alias for userId to avoid many errors
      email: string;
      companyId: string;
      sessionId?: string;
      roles?: string[];
      permissions?: string[];
      type: 'access' | 'refresh';
    };
  }
}
