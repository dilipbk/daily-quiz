import { Server } from 'node:http';
import { serve } from '@hono/node-server';

/**
 * How long a stop waits for requests in flight before it closes their connections. It stays
 * under Fly's default `kill_timeout` of 5 s, so the platform never has to kill the process.
 */
export const SHUTDOWN_DEADLINE_MS = 4_000;

export type StopOutcome = 'clean' | 'forced';

export interface RunningServer {
  readonly port: number;
  /**
   * Stops accepting connections, closes idle ones and lets requests in flight finish. After
   * `deadlineMs` it closes whatever is left and resolves `forced`.
   */
  stop(deadlineMs: number): Promise<StopOutcome>;
}

export type Fetch = (request: Request) => Response | Promise<Response>;

/** Listens on `hostname:port` (port 0 picks a free one) and resolves once it accepts connections. */
export function startServer(
  fetch: Fetch,
  options: { port: number; hostname: string },
): Promise<RunningServer> {
  return new Promise((resolve, reject) => {
    let stopping = false;
    const server = serve({ fetch, port: options.port, hostname: options.hostname });
    if (!(server instanceof Server)) {
      reject(new TypeError('Expected an HTTP/1.1 server.'));
      return;
    }
    server.once('error', reject);
    server.once('listening', () => {
      server.off('error', reject);
      const address = server.address();
      resolve({
        port: typeof address === 'object' && address !== null ? address.port : options.port,
        stop: (deadlineMs) => {
          stopping = true;
          return stop(server, deadlineMs);
        },
      });
    });

    // close() drops the keep-alive connections that are idle when it is called. One that is
    // carrying a request turns idle when its response finishes, so it is dropped then.
    server.on('request', (_request, response) => {
      response.once('finish', () => {
        if (stopping) {
          setImmediate(() => {
            server.closeIdleConnections();
          });
        }
      });
    });
  });
}

function stop(server: Server, deadlineMs: number): Promise<StopOutcome> {
  return new Promise((resolve) => {
    let outcome: StopOutcome = 'clean';
    const deadline = setTimeout(() => {
      outcome = 'forced';
      server.closeAllConnections();
    }, deadlineMs);
    server.close(() => {
      clearTimeout(deadline);
      resolve(outcome);
    });
  });
}

export interface SignalOptions {
  readonly on: (signal: 'SIGTERM' | 'SIGINT', listener: () => void) => void;
  readonly deadlineMs: number;
  readonly exit: (code: number) => void;
  readonly log: (line: string) => void;
}

/**
 * Stops the server on SIGTERM (Docker's stop signal) or SIGINT (Fly's default `kill_signal`),
 * once, then exits 0 when the stop was clean and 1 when it was forced. Node runs as PID 1 in
 * the container, where a signal with no handler does nothing.
 */
export function stopOnSignals(server: RunningServer, options: SignalOptions): void {
  let stopping = false;
  const handle = (signal: 'SIGTERM' | 'SIGINT'): void => {
    if (stopping) return;
    stopping = true;
    const started = performance.now();
    options.log(`stopping on ${signal}`);
    void server.stop(options.deadlineMs).then((outcome) => {
      options.log(`stopped (${outcome}) in ${String(Math.round(performance.now() - started))} ms`);
      options.exit(outcome === 'clean' ? 0 : 1);
    });
  };
  options.on('SIGTERM', () => {
    handle('SIGTERM');
  });
  options.on('SIGINT', () => {
    handle('SIGINT');
  });
}
