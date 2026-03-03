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

  const userPayload = request.user as any;

  // Sliding Session & Active check
  if (userPayload.sessionId) {
    const session = await request.server.prisma.session.findUnique({
      where: { id: userPayload.sessionId }
    });

    if (!session || !session.isActive) {
      throw new UnauthorizedError('Session is no longer active');
    }

    try {
      await request.server.prisma.session.update({
        where: { id: userPayload.sessionId },
        data: { lastActivityAt: new Date() }
      });
    } catch (e) {
      // Ignorar si falla el update de actividad
    }
  }

  if (!userPayload || !userPayload.companyId) {
    request.log.error({ user: userPayload }, 'Company ID not found in token');
    throw new ForbiddenError('Company ID not found in token');
  }

  // 2. Validate User and Company are still active in DB
  const user = await request.server.prisma.user.findUnique({
    where: { id: userPayload.id },
    include: { company: true }
  });

  if (!user || !user.isActive) {
    throw new UnauthorizedError('User is inactive or not found');
  }

  if (!user.company || !user.company.isActive) {
    throw new ForbiddenError('Company is inactive or not found');
  }

  // Inject companyId into request for use in handlers
  request.companyId = user.companyId;
}
