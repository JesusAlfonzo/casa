import { ENV } from '#config/env.js';
import app from '#app.js';

app.listen(ENV.PORT, () => {
  console.log(`El servidor está corriendo en http://localhost:${ENV.PORT}`);
  console.log(
    `URL de estatus del servidor: http://localhost:${ENV.PORT}/health`
  );
});
