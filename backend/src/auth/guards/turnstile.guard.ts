import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';
import { TurnstileService } from '../../common/services/turnstile.service';
import { InvalidTurnstileTokenException } from '../exceptions/invalid-turnstile-token.exception';

/**
 * Gates POST /auth/register behind Cloudflare Turnstile (Step 7). Reads
 * `turnstileToken` straight off the raw request body rather than the DTO —
 * guards run before the ValidationPipe, same reason LoginRateLimitGuard
 * reads `email` raw (see that guard's comment). `turnstileToken` is
 * deliberately not added to RegisterDto: it's a one-shot verification
 * concern for this guard alone, never passed on to AuthService.register().
 *
 * A CAPTCHA fits registration better than a request counter here (see
 * architecture.md#rate-limiting) — it's a one-shot action, so a counter
 * can't distinguish a bot spinning up accounts from a genuine user who
 * mistyped something on a first try.
 */
@Injectable()
export class TurnstileGuard implements CanActivate {
  constructor(private turnstile: TurnstileService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (process.env.OPSDESK_HOSTED_DEMO === 'true')
      throw new NotFoundException();
    const request = context.switchToHttp().getRequest<Request>();
    const body = request.body as unknown;
    const token =
      body && typeof body === 'object' && 'turnstileToken' in body
        ? (body as Record<string, unknown>).turnstileToken
        : undefined;

    if (typeof token !== 'string' || !token) {
      throw new InvalidTurnstileTokenException();
    }

    const verified = await this.turnstile.verify(token, request.ip);
    if (!verified) {
      throw new InvalidTurnstileTokenException();
    }

    return true;
  }
}
