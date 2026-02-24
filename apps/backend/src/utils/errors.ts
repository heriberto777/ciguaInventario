import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

export class AppError extends Error {
  public statusCode: number;
  public code: string;

  constructor(statusCodeOrMessage: number | string, messageOrCode?: string, code?: string) {
    let statusCode: number;
    let message: string;
    let errorCode: string;

    // Handle both AppError(statusCode, message, code) and AppError(message, statusCode)
    if (typeof statusCodeOrMessage === 'number') {
      statusCode = statusCodeOrMessage;
      message = messageOrCode || 'Internal Server Error';
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

  logger.error({ err: error }, 'Unhandled error');
  return reply.status(500).send({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
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
