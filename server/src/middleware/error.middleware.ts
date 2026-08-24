import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';

export const errorMiddleware: ErrorRequestHandler = (error, _req, res, _next) => {
  console.error(error);

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        ...(env.NODE_ENV === 'production' ? {} : { stack: error.stack }),
      },
    });
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'BAD_REQUEST',
        message: 'Invalid request body',
        ...(env.NODE_ENV === 'production' ? {} : { issues: error.issues }),
      },
    });
    return;
  }

  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
      ...(env.NODE_ENV === 'production' ? {} : { stack: error instanceof Error ? error.stack : undefined }),
    },
  });
};
