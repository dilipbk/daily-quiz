// The image's entry point: `node apps/api/src/main.ts <command>` (ADR 0079). Node is started
// directly, so it is PID 1 and receives the platform's stop signal itself.
import { createApp } from './app.ts';
import { ConfigError, readCommit, readPort } from './env.ts';
import { SHUTDOWN_DEADLINE_MS, startServer, stopOnSignals } from './server.ts';

const log = (line: string): void => {
  console.log(line);
};

async function api(): Promise<void> {
  const port = readPort(process.env);
  const commit = readCommit(process.env);
  const server = await startServer(createApp({ commit }).fetch, { port, hostname: '0.0.0.0' });
  log(`api listening on 0.0.0.0:${String(server.port)}, commit ${commit}`);
  stopOnSignals(server, {
    on: (signal, listener) => process.on(signal, listener),
    deadlineMs: SHUTDOWN_DEADLINE_MS,
    exit: (code) => process.exit(code),
    log,
  });
}

// One image, one process type per command (ADR 0051). `worker` arrives with the first job ticket.
const commands: Readonly<Record<string, () => Promise<void>>> = { api };

const name = process.argv[2] ?? '';
const command = Object.hasOwn(commands, name) ? commands[name] : undefined;
if (command === undefined) {
  console.error(`usage: node apps/api/src/main.ts ${Object.keys(commands).join('|')}`);
  process.exitCode = 64;
} else {
  try {
    await command();
  } catch (error) {
    // A setting it can't use, or a port it can't take: say which, then stop.
    console.error(error instanceof ConfigError ? error.message : error);
    process.exitCode = 1;
  }
}
