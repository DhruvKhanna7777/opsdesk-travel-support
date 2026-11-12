import { timingSafeEqual } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

/** The public Render URL accepts application traffic only from the web server. */
export function hostedDemoGate(secret: string) {
  const expected = Buffer.from(secret);
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.path === '/health/ready' || req.path === '/health/worker')
      return next();
    if (req.path === '/auth/register')
      return res.status(404).json({ statusCode: 404, message: 'Not Found' });
    const provided = Buffer.from(req.header('x-opsdesk-demo-gate') ?? '');
    if (
      provided.length !== expected.length ||
      !timingSafeEqual(provided, expected)
    )
      return res.status(401).json({ statusCode: 401, message: 'Unauthorized' });
    return next();
  };
}
