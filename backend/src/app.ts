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
import supplierRoutes from '#routes/supplier.routes.js';
import measurementUnitRoutes from '#routes/measurement-unit.routes.js';
import productRoutes from '#routes/product.routes.js';
import supplierProductRoutes from '#routes/supplier-product.routes.js';
import locationRoutes from '#routes/location.routes.js';
import inventoryRoutes from '#routes/inventory.routes.js';
import purchaseRoutes from '#routes/purchase.routes.js';
import currencyRoutes from '#routes/currency.routes.js';
import exchangeRateRoutes from '#routes/exchange-rate.routes.js';
import paymentMethodRoutes from '#routes/payment-method.routes.js';
import financialAccountRoutes from '#routes/financial-account.routes.js';
import paymentTransactionRoutes from '#routes/payment-transaction.routes.js';
import serviceTypeRoutes from '#routes/service-type.routes.js';
import serviceRoutes from '#routes/service.routes.js';
import streamingRoutes from '#routes/streaming.routes.js';
import streamingProfileRoutes from '#routes/streaming-profile.routes.js';
import customerRoutes from '#routes/customer.routes.js';
import subscriptionRoutes from '#routes/subscription.routes.js';
import saleRoutes from '#routes/sale.routes.js';
import userRoutes from '#routes/user.routes.js';
import roleRoutes from '#routes/role.routes.js';
import permissionRoutes from '#routes/permission.routes.js';
import swaggerUi from 'swagger-ui-express';
import { openApiSpec, swaggerUiOptions } from '#docs/swagger.js';

const app: Express = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Documentación de API (OpenAPI 3.0 / Swagger UI)
app.get('/api/docs.json', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(openApiSpec);
});
app.use(
  '/api/docs',
  swaggerUi.serve,
  swaggerUi.setup(openApiSpec, swaggerUiOptions)
);

// Estatus del servidor
app.use('/health', getHealth);

// Rutas de la API (/api/...)
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/measurement-units', measurementUnitRoutes);
app.use('/api/products', productRoutes);
app.use('/api/supplier-products', supplierProductRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/inventories', inventoryRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/currencies', currencyRoutes);
app.use('/api/exchange-rates', exchangeRateRoutes);
app.use('/api/payment-methods', paymentMethodRoutes);
app.use('/api/financial-accounts', financialAccountRoutes);
app.use('/api/payment-transactions', paymentTransactionRoutes);
app.use('/api/service-types', serviceTypeRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/streaming-accounts', streamingRoutes);
app.use('/api/streaming-profiles', streamingProfileRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/sales', saleRoutes);

// Middleware global de captura de errores
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  console.error('Error no controlado:', err);
  const status = err.statusCode || err.status || 500;
  res.status(status).json({
    error: err.message || 'Error interno del servidor',
  });
});

export default app;
