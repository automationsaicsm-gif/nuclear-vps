import { Response } from 'express';

export const success = (res: Response, data: unknown, statusCode = 200) => {
  return res.status(statusCode).json({ success: true, data });
};

export const error = (res: Response, message: string, statusCode = 400, details?: unknown) => {
  return res.status(statusCode).json({ success: false, error: message, ...(details ? { details } : {}) });
};
