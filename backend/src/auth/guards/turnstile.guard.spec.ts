import { ExecutionContext, NotFoundException } from '@nestjs/common';
import { TurnstileGuard } from './turnstile.guard';
import { TurnstileService } from '../../common/services/turnstile.service';

describe('registration in hosted demo', () => {
  it('does not call Turnstile when hosted registration is disabled', async () => {
    const old = process.env.OPSDESK_HOSTED_DEMO;
    process.env.OPSDESK_HOSTED_DEMO = 'true';
    const verify = jest.fn();
    const guard = new TurnstileGuard({ verify } as unknown as TurnstileService);
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ body: { turnstileToken: 'x' } }),
      }),
    } as unknown as ExecutionContext;
    try {
      await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(verify).not.toHaveBeenCalled();
    } finally {
      if (old === undefined) delete process.env.OPSDESK_HOSTED_DEMO;
      else process.env.OPSDESK_HOSTED_DEMO = old;
    }
  });
});
