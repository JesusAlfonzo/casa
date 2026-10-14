import app from './app.js';
import { ENV } from './config/env.ts';

app.listen(ENV.PORT, () => {
  console.log('Servidor Funcionando');
});
