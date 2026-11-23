import { EventEmitter } from 'node:events';
import { Agent, request } from 'node:http';
import { Hono } from 'hono';
import { afterEach, describe, expect, it } from 'vitest';
import { startServer, stopOnSignals, type RunningServer } from '../src/server.ts';

// The platform stops a machine with a signal and expects it gone within its kill timeout
// (Fly: 5 s). The process must finish what it is doing, drop idle connections and exit.

interface Response {
  status: number;
  body: string;
}

function get(port: number, path: string, agent?: Agent): Promise<Response> {
  return new Promise((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port, path, agent }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk: string) => (body += chunk));
      res.on('end', () => {
        resolve({ status: res.statusCode ?? 0, body });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

/** An app whose `/slow` route waits until the test releases it. */
function testApp() {
  let entered!: () => void;
  let release!: () => void;
  const inside = new Promise<void>((resolve) => (entered = resolve));
  const released = new Promise<void>((resolve) => (release = resolve));
  const app = new Hono();
  app.get('/fast', (c) => c.text('fast'));
  app.get('/slow', async (c) => {
    entered();
    await released;
    return c.text('slow');
  });
  return { app, inside, release };
}

const running: RunningServer[] = [];

async function start(app: Hono): Promise<RunningServer> {
  const server = await startServer(app.fetch, { port: 0, hostname: '127.0.0.1' });
  running.push(server);
  return server;
}

afterEach(async () => {
  await Promise.all(running.splice(0).map((server) => server.stop(0)));
});

describe('startServer', () => {
  it('serves the app on the port it reports', async () => {
    const server = await start(testApp().app);

    expect(server.port).toBeGreaterThan(0);
    expect(await get(server.port, '/fast')).toEqual({ status: 200, body: 'fast' });
  });

  it('refuses to start when the port is taken', async () => {
    const first = await start(testApp().app);

    await expect(
      startServer(testApp().app.fetch, { port: first.port, hostname: '127.0.0.1' }),
    ).rejects.toThrow(/EADDRINUSE/);
  });
});

describe('RunningServer.stop', () => {
  it('stops at once, "clean", with nothing in flight, and refuses new connections', async () => {
    const server = await start(testApp().app);
    const started = performance.now();

    expect(await server.stop(4_000)).toBe('clean');
    expect(performance.now() - started).toBeLessThan(500);
    await expect(get(server.port, '/fast')).rejects.toThrow(/ECONNREFUSED/);
  });

  it('closes an idle keep-alive connection instead of waiting for it', async () => {
    const server = await start(testApp().app);
    const agent = new Agent({ keepAlive: true });
    await get(server.port, '/fast', agent);
    const started = performance.now();

    expect(await server.stop(4_000)).toBe('clean');
    expect(performance.now() - started).toBeLessThan(500);
    agent.destroy();
  });

  it('lets a request already in flight finish before it stops', async () => {
    const { app, inside, release } = testApp();
    const server = await start(app);
    const agent = new Agent({ keepAlive: true });
    const response = get(server.port, '/slow', agent);
    await inside;
    const started = performance.now();

    const stopping = server.stop(4_000);
    release();

    expect(await response).toEqual({ status: 200, body: 'slow' });
    expect(await stopping).toBe('clean');
    expect(performance.now() - started).toBeLessThan(500);
    agent.destroy();
  });

  it('closes what is left after the deadline and says "forced"', async () => {
    const { app, inside } = testApp();
    const server = await start(app);
    const response = get(server.port, '/slow');
    response.catch(() => undefined);
    await inside;
    const started = performance.now();

    expect(await server.stop(100)).toBe('forced');
    expect(performance.now() - started).toBeGreaterThanOrEqual(90);
    await expect(response).rejects.toThrow();
  });
});

describe('stopOnSignals', () => {
  it.each([
    ['SIGTERM', 'clean', 0],
    ['SIGINT', 'clean', 0],
    ['SIGTERM', 'forced', 1],
  ] as const)(
    'on %s stops once and exits with the code for %s (%i)',
    async (signal, outcome, code) => {
      const signals = new EventEmitter();
      const stops: number[] = [];
      const exits: number[] = [];
      const lines: string[] = [];
      const server: RunningServer = {
        port: 0,
        stop: (deadlineMs) => {
          stops.push(deadlineMs);
          return Promise.resolve(outcome);
        },
      };

      stopOnSignals(server, {
        on: (name, listener) => signals.on(name, listener),
        deadlineMs: 4_000,
        exit: (exitCode) => exits.push(exitCode),
        log: (line) => lines.push(line),
      });
      signals.emit(signal);
      signals.emit('SIGTERM');
      signals.emit('SIGINT');
      await new Promise((resolve) => setImmediate(resolve));

      expect(stops).toEqual([4_000]);
      expect(exits).toEqual([code]);
      expect(lines.join('\n')).toContain(signal);
      expect(lines.join('\n')).toContain(outcome);
    },
  );
});
