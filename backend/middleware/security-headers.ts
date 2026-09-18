import helmet from 'helmet';
import type { NextFunction, Request, Response } from 'express';

export function securityHeaders(): (req: Request, res: Response, next: NextFunction) => void {
  return helmet();
}
