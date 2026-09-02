import { createApp } from './app.js';
import { env } from './env.js';

createApp().listen(env.port, () => {
  console.log(`API listening on http://localhost:${env.port}`);
  console.log(`CORS origins: ${env.allowedOrigins.join(', ')}`);
});
