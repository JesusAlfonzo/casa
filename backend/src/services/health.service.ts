import { prisma } from '#config/prisma.js';

export const checkSystemHealth = async () => {
  let dbStatus = 'DISCONNECTED';

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'CONNECTED';
  } catch (error) {
    dbStatus = 'ERROR';
    console.error('Message: Error al conectar a la base de datos:', error);
  }

  return {
    status: dbStatus === 'CONNECTED' ? 'OK' : 'DEGRADED',
    database: dbStatus,
    timestamp: new Date().toISOString(),
    message:
      dbStatus === 'CONNECTED'
        ? 'El Sistema Casa esta en linea y conectado a la base de datos.'
        : 'El Sistema Casa esta en linea pero no tiene conexion con la base de datos.',
  };
};
