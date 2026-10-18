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

const app: Express = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Estatus del servidor
app.use('/health', getHealth);

// Rutas de la API (/api/...)
app.use('/api/auth', authRoutes);
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

// Middleware global de captura de errores
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  console.error('Error no controlado:', err);
  const status = err.statusCode || err.status || 500;
  res.status(status).json({
    error: err.message || 'Error interno del servidor',
  });
});

export default app;
