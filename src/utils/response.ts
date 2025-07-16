import { Response } from 'express';
import { ApiResponse } from '@/types';
import { constants, ErrorCode } from '@/config';

export class ResponseUtil {
  static success<T>(res: Response, data?: T, message: string = 'Success', statusCode: number = 200): void {
    const response: ApiResponse<T> = {
      success: true,
      message,
      data
    };
    res.status(statusCode).json(response);
  }

  static error(
    res: Response,
    message: string,
    statusCode: number = 500,
    code?: ErrorCode,
    details?: any
  ): void {
    const response: ApiResponse = {
      success: false,
      message,
      error: message,
      code
    };

    // Add details in development mode
    if (process.env.NODE_ENV === 'development' && details) {
      response.data = { details };
    }

    res.status(statusCode).json(response);
  }

  static validationError(res: Response, details: any[]): void {
    this.error(
      res,
      'Validation failed',
      400,
      constants.ERROR_CODES.VALIDATION_ERROR,
      details
    );
  }

  static badRequest(res: Response, message: string = 'Bad request', code?: ErrorCode): void {
    this.error(res, message, 400, code || constants.ERROR_CODES.VALIDATION_ERROR);
  }

  static unauthorized(res: Response, message: string = 'Unauthorized', code?: ErrorCode): void {
    this.error(res, message, 401, code);
  }

  static forbidden(res: Response, message: string = 'Forbidden', code?: ErrorCode): void {
    this.error(res, message, 403, code);
  }

  static notFound(res: Response, message: string = 'Not found', code?: ErrorCode): void {
    this.error(res, message, 404, code || constants.ERROR_CODES.NOT_FOUND);
  }

  static conflict(res: Response, message: string, code?: ErrorCode): void {
    this.error(res, message, 409, code);
  }

  static internalError(res: Response, message: string = 'Internal server error', details?: any): void {
    this.error(res, message, 500, constants.ERROR_CODES.INTERNAL_ERROR, details);
  }

  static created<T>(res: Response, data?: T, message: string = 'Created successfully'): void {
    this.success(res, data, message, 201);
  }

  static noContent(res: Response, message: string = 'No content'): void {
    res.status(204).json({
      success: true,
      message
    });
  }
}
