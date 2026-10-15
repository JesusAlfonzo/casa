import express, { type Express } from 'express';
import getHealth from '#routes/health.routes.js';

const app: Express = express();

app.use('/health', getHealth);

export default app;
