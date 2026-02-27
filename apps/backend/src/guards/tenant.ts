import { FastifyRequest, FastifyReply } from 'fastify';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';

declare module 'fastify' {
  interface FastifyRequest {
    // Rely on @fastify/jwt augmentation for 'user', but add 'companyId' here
    companyId?: string;
  }
}

export async function tenantGuard(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch (err: any) {
    request.log.warn({
      err: err.message,
      code: err.code,
      headers: request.headers.authorization ? 'Present' : 'Missing'
    }, 'JWT Verification failed');
    throw new UnauthorizedError('Invalid or missing token');
  }

  const user = request.user as any;
  if (!user || !user.companyId) {
    request.log.error({ user }, 'Company ID not found in token');
    throw new ForbiddenError('Company ID not found in token');
  }

  // Inject companyId into request for use in handlers
  request.companyId = user.companyId;
}
