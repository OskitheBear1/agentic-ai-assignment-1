/**
 * Vercel serverless entry point.
 *
 * Vercel runs the Express app as a function rather than a long-lived process,
 * so we export the app instead of calling listen(). vercel.json rewrites every
 * path to this file.
 */
import { createApp } from '../src/app.js';

export default createApp();
