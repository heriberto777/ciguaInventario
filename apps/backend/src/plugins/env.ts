import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production']).default('development'),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRY: z.string().default('24h'),   // Standard duration string
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  ERP_MSSQL_HOST: z.string().optional(),
  ERP_MSSQL_PORT: z.coerce.number().optional(),
  ERP_MSSQL_USER: z.string().optional(),
  ERP_MSSQL_PASSWORD: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export default fp(async (fastify: FastifyInstance) => {
  try {
    const env = envSchema.parse(process.env);
    fastify.decorate('config', env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .filter(err => err.code === 'invalid_type' && err.received === 'undefined')
        .map(err => err.path.join('.'))
        .join(', ');

      console.error('❌ Error de configuración: Faltan variables de entorno requeridas:', missingVars);
      throw new Error(`Configuración incompleta: Faltan [${missingVars}]. Verifica tu archivo .env o la configuración de PM2.`);
    }
    throw error;
  }
});

declare module 'fastify' {
  interface FastifyInstance {
    config: Env;
  }
}
