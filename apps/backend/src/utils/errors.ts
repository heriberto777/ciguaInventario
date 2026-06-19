import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

export class AppError extends Error {
  public statusCode: number;
  public code: string;

  constructor(statusCodeOrMessage: number | string, messageOrCode?: string | number, code?: string) {
    let statusCode: number;
    let message: string;
    let errorCode: string;

    // Handle both AppError(statusCode, message, code) and AppError(message, statusCode)
    if (typeof statusCodeOrMessage === 'number') {
      statusCode = statusCodeOrMessage;
      message = (messageOrCode as string) || 'Internal Server Error';
      errorCode = code || 'INTERNAL_ERROR';
    } else {
      // Backwards compatibility: AppError(message, statusCode)
      message = statusCodeOrMessage;
      statusCode = typeof messageOrCode === 'number' ? messageOrCode : 500;
      errorCode = code || 'INTERNAL_ERROR';
    }

    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = errorCode;
  }
}

export async function errorHandler(error: Error, request: FastifyRequest, reply: FastifyReply) {
  const logger = request.log;

  if (error instanceof AppError) {
    logger.warn({ err: error, code: error.code }, error.message);
    return reply.status(error.statusCode).send({
      error: {
        code: error.code,
        message: error.message,
      },
    });
  }

  if (error instanceof z.ZodError) {
    logger.warn({ err: error }, 'Validation error');
    return reply.status(400).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request',
        details: error.errors,
      },
    });
  }

  // Handle Fastify/AJV validation errors
  if ((error as any).code === 'FST_ERR_VALIDATION') {
    logger.warn({ err: error }, 'Fastify validation error');
    return reply.status(400).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: error.message,
        details: (error as any).validation,
      },
    });
  }

  // Prisma P2002 — unique constraint: responder 409 en lugar de 500
  if ((error as any).code === 'P2002') {
    const fields = (error as any).meta?.target?.join(', ') || 'unknown field';
    logger.warn({ err: error }, 'Unique constraint violation');
    return reply.status(409).send({
      error: {
        code: 'CONFLICT',
        message: `Ya existe un registro con el mismo valor en: ${fields}`,
      },
    });
  }

  // Prisma P2022 — columna no existe en la DB: error de schema drift
  if ((error as any).code === 'P2022') {
    logger.error({ err: error }, 'Schema drift: column missing in DB — run prisma migrate deploy');
    return reply.status(500).send({
      error: {
        code: 'SCHEMA_DRIFT',
        message: 'Error de base de datos: columna faltante. Ejecuta las migraciones pendientes.',
      },
    });
  }

  logger.error({ err: error }, 'Unhandled error');
  return reply.status((error as any).statusCode || 500).send({
    error: {
      code: (error as any).code || 'INTERNAL_SERVER_ERROR',
      message: error.message || 'An unexpected error occurred',
    },
  });
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message, 'VALIDATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(404, message, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(401, message, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(403, message, 'FORBIDDEN');
  }
}
