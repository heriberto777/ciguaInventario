import { FastifyRequest, FastifyReply } from 'fastify';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      userId?: string;
      id?: string;
      email?: string;
      companyId?: string;
      type?: 'access' | 'refresh';
      iat?: number;
      exp?: number;
    };
    companyId?: string;
  }
}

export async function tenantGuard(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch (err) {
    throw new UnauthorizedError('Invalid or missing token');
  }

  const user = request.user as any;
  if (!user?.companyId) {
    throw new ForbiddenError('Company ID not found in token');
  }

  // Inject companyId into request for use in handlers
  request.companyId = user.companyId;
}
