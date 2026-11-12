import { ForbiddenException, Logger } from '@nestjs/common';
import { TravelController } from './travel.controller';

jest.mock('./travel.service', () => ({
  TravelService: class TravelService {},
}));

describe('workspace usage observation', () => {
  const originalSetting = process.env.OPSDESK_WORKSPACE_OBSERVATION;
  const response = {
    me: { id: 'private-user', kind: 'MANAGER', name: 'Private name' },
    tickets: [{ id: 'private-case', description: 'private case content' }],
  };
  const req = {
    user: { userId: 'private-user' },
    headers: { authorization: 'private-token', 'user-agent': 'private-client' },
    ip: 'private-address',
    query: { compact: '1', private: 'private-query' },
  };
  let log: jest.SpyInstance<void, [message: unknown, ...params: unknown[]]>;
  let travel: { workspace: jest.Mock };
  let controller: TravelController;

  beforeEach(() => {
    delete process.env.OPSDESK_WORKSPACE_OBSERVATION;
    log = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    travel = { workspace: jest.fn().mockResolvedValue(response) };
    controller = new TravelController(travel as never);
  });
  afterEach(() => {
    if (originalSetting === undefined)
      delete process.env.OPSDESK_WORKSPACE_OBSERVATION;
    else process.env.OPSDESK_WORKSPACE_OBSERVATION = originalSetting;
    jest.restoreAllMocks();
  });

  it.each([undefined, 'false', 'TRUE', 'true '])(
    'does not observe without the exact opt-in (%s)',
    async (setting) => {
      if (setting !== undefined)
        process.env.OPSDESK_WORKSPACE_OBSERVATION = setting;
      await expect(controller.workspace(req as never, '1')).resolves.toBe(
        response,
      );
      expect(log).not.toHaveBeenCalled();
    },
  );

  it.each([
    [undefined, false, 'full'],
    ['0', false, 'full'],
    ['true', false, 'full'],
    ['1', true, 'compact'],
  ])(
    'preserves response-mode selection for compact=%s',
    async (flag, compact, mode) => {
      process.env.OPSDESK_WORKSPACE_OBSERVATION = 'true';
      await expect(controller.workspace(req as never, flag)).resolves.toBe(
        response,
      );
      expect(travel.workspace).toHaveBeenCalledWith('private-user', compact);
      expect(log).toHaveBeenCalledTimes(1);
      const event = JSON.parse(String(log.mock.calls[0][0])) as Record<
        string,
        unknown
      >;
      expect(Object.keys(event).sort()).toEqual([
        'at',
        'event',
        'mode',
        'role',
        'version',
      ]);
      expect(event.event).toBe('opsdesk.workspace.response');
      expect(event.version).toBe(1);
      expect(event.mode).toBe(mode);
      expect(event.role).toBe('MANAGER');
      expect(typeof event.at).toBe('string');
      expect(Number.isFinite(Date.parse(String(event.at)))).toBe(true);
      expect(JSON.stringify(event)).not.toContain('private');
    },
  );

  it.each([
    'MANAGER',
    'AGENT',
    'AGENCY',
    'CUSTOMER',
    'SUPPLIER',
    'private-role',
  ])('emits only allowlisted role metadata (%s)', async (kind) => {
    process.env.OPSDESK_WORKSPACE_OBSERVATION = 'true';
    travel.workspace.mockResolvedValue({
      ...response,
      me: { ...response.me, kind },
    });
    await controller.workspace(req as never, '1');
    const event = JSON.parse(String(log.mock.calls[0][0])) as Record<
      string,
      unknown
    >;
    expect(event.role).toBe(kind === 'private-role' ? 'UNKNOWN' : kind);
    expect(JSON.stringify(event)).not.toContain('private');
  });

  it('does not log a successful response when authorization/read fails', async () => {
    process.env.OPSDESK_WORKSPACE_OBSERVATION = 'true';
    const failure = new ForbiddenException('private failure');
    travel.workspace.mockRejectedValue(failure);
    await expect(controller.workspace(req as never, '1')).rejects.toBe(failure);
    expect(log).not.toHaveBeenCalled();
  });

  it('preserves the response when the observation sink fails', async () => {
    process.env.OPSDESK_WORKSPACE_OBSERVATION = 'true';
    log.mockImplementation(() => {
      throw new Error('sink unavailable');
    });
    await expect(controller.workspace(req as never, '1')).resolves.toBe(
      response,
    );
  });
});
