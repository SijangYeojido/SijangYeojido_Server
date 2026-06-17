import 'dotenv/config';
import { DataSource } from 'typeorm';

async function bootstrapSchema() {
  const databaseUrl = process.env.DATABASE_URL;
  const dataSource = new DataSource({
    type: 'postgres',
    ...(databaseUrl
      ? { url: databaseUrl }
      : {
          host: process.env.DB_HOST,
          port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
          username: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          database: process.env.DB_NAME,
        }),
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: false,
  });

  await dataSource.initialize();
  await dataSource.synchronize(false);
  await dataSource.destroy();
}

bootstrapSchema().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
