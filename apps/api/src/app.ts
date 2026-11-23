import { Hono } from 'hono';

export interface AppOptions {
  /** The commit the image was built from, or `unknown`. */
  readonly commit: string;
}

/** The API's Hono app. BE-01 mounts the routes of the contracts registry beside `/health`. */
export function createApp({ commit }: AppOptions): Hono {
  const app = new Hono();

  // An operations probe for the platform, outside the contracts registry and OpenAPI (ADR 0079).
  // Liveness only: a database blip must not take every machine out of rotation at once.
  app.get('/health', (c) => {
    c.header('Cache-Control', 'no-store');
    return c.json({ status: 'ok', commit });
  });

  return app;
}
