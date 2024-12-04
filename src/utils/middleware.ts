import { Request, Response, NextFunction } from 'express';

export const logRequestDetails = 
(req: Request, 
  res: Response, 
  next: NextFunction) => {
  console.log(`Request received: ${req.method} ${req.path}`);
  next();
}; 