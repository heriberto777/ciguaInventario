import fp from 'fastify-plugin';

declare module 'fastify' {
  interface FastifyInstance {
    config: any;
    prisma: any;
    generateTokens: any;
    auditLog: any;
  }

  interface FastifyRequest {
    companyId?: string;
    user: {
      userId: string;
      email: string;
      companyId: string;
      id: string; // alias for userId
      type?: 'access' | 'refresh';
    };
  }
}

