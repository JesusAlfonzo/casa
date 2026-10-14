import express, { type Express, type Request, type Response } from 'express';

const app: Express = express();

app.get('/', (req: Request, res: Response) => {
  res.send('Hello W0rld! updated');
});

app.get('/day', (req: Request, res: Response) => {
  res.send('lunes');
});

export default app;
