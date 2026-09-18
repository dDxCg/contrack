import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export interface RequestWithId extends Request {
  id: string;
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: RequestWithId, res: Response, next: NextFunction): void {
    const incoming = req.headers['x-request-id'];
    const id = typeof incoming === 'string' && incoming !== '' ? incoming : randomUUID();
    req.id = id;
    res.setHeader('X-Request-Id', id);
    next();
  }
}
