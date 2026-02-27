import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import * as bcrypt from 'bcrypt';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const RefreshTokenSchema = z.object({
  refreshToken: z.string(),
});

export async function loginController(
  fastify: FastifyInstance,
  request: FastifyRequest<{ Body: Record<string, any> }>,
  reply: FastifyReply
) {
  const { email, password } = LoginSchema.parse(request.body);

  const user = await fastify.prisma.user.findUnique({
    where: { email },
    include: {
      company: true,
      userRoles: {
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: true
                }
              }
            }
          }
        }
      }
    },
  });

  if (!user) {
    return reply.status(401).send({ error: { code: 'INVALID_CREDENTIALS' } });
  }

  // Verificar contraseña con bcrypt
  const isPasswordValid = await bcrypt.compare(password, user.password || '');
  if (!isPasswordValid) {
    return reply.status(401).send({ error: { code: 'INVALID_CREDENTIALS' } });
  }

  // Extraer roles y permisos
  const roles = user.userRoles.map(ur => ur.role.name);
  const permissions = Array.from(new Set(
    user.userRoles.flatMap(ur => ur.role.rolePermissions.map(rp => rp.permission.name))
  ));

  // Generate tokens
  const { accessToken, refreshToken } = fastify.generateTokens({
    userId: user.id,
    email: user.email,
    companyId: user.companyId,
    roles,
    permissions,
  });

  // Create a session record
  const userAgent = request.headers['user-agent'] || '';
  const ipAddress = request.ip || request.socket.remoteAddress || '';

  await fastify.prisma.session.create({
    data: {
      userId: user.id,
      companyId: user.companyId,
      userAgent,
      ipAddress,
      isActive: true,
      lastActivityAt: new Date(),
    },
  });

  return reply.send({
    data: {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`.trim(),
        companyId: user.companyId,
        roles,
        permissions,
      },
    },
  });
}

export async function refreshTokenController(
  fastify: FastifyInstance,
  request: FastifyRequest<{ Body: Record<string, any> }>,
  reply: FastifyReply
) {
  const { refreshToken } = RefreshTokenSchema.parse(request.body);

  try {
    // Verify refresh token
    const decoded = fastify.jwt.verify(refreshToken) as any;

    if (decoded.type !== 'refresh') {
      return reply.status(401).send({ error: { code: 'INVALID_TOKEN_TYPE' } });
    }

    // Re-fetch user to get current roles and permissions
    const user = await fastify.prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!user) {
      return reply.status(401).send({ error: { code: 'USER_NOT_FOUND' } });
    }

    const roles = user.userRoles.map(ur => ur.role.name);
    const permissions = Array.from(new Set(
      user.userRoles.flatMap(ur => ur.role.rolePermissions.map(rp => rp.permission.name))
    ));

    // Generate new tokens
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
      fastify.generateTokens({
        userId: user.id,
        email: user.email,
        companyId: user.companyId,
        roles,
        permissions,
      });

    // Update cookies (using as any to avoid lint if plugin is not fully typed in this context)
    const replyAny = reply as any;
    if (replyAny.setCookie) {
      replyAny.setCookie('accessToken', newAccessToken, {
        httpOnly: true,
        secure: fastify.config.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: fastify.config.JWT_ACCESS_EXPIRY,
      });

      replyAny.setCookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: fastify.config.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: fastify.config.JWT_REFRESH_EXPIRY,
      });
    }

    return reply.send({
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    return reply.status(401).send({ error: { code: 'INVALID_REFRESH_TOKEN' } });
  }
}

export async function logoutController(
  fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const replyAny = reply as any;
  if (replyAny.clearCookie) {
    replyAny.clearCookie('accessToken');
    replyAny.clearCookie('refreshToken');
  }

  return reply.send({ data: { success: true } });
}
