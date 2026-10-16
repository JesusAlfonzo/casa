import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from 'express';
import getHealth from '#routes/health.routes.js';
import authRoutes from '#routes/auth.routes.js';
import brandRoutes from '#routes/brand.routes.js';
import categoryRoutes from '#routes/category.routes.js';

const app: Express = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Estatus del servidor
app.use('/health', getHealth);

// Rutas de la API (/api/...)
app.use('/api/auth', authRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/categories', categoryRoutes);

// Middleware global de captura de errores
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  console.error('Error no controlado:', err);
  const status = err.statusCode || err.status || 500;
  res.status(status).json({
    error: err.message || 'Error interno del servidor',
  });
});

export default app;
