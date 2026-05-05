import { createStrapi, type Core } from '@strapi/strapi';
import path from 'node:path';

let instance: Core.Strapi | null = null;

/** Set minimal env-vars required by Strapi config before boot. */
const setTestEnv = () => {
  process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
  // PORT=0 заставляет ОС назначить случайный свободный порт при listen() —
  // никаких коллизий с dev-сервером, никаких хардкодов, безопасно для CI-параллелизма.
  // supertest всё равно общается с http-сервером напрямую через handler,
  // так что фактический порт не важен — нужен только успешный bind.
  // TEST_PORT по-прежнему работает как override, если зачем-то нужен фиксированный порт.
  process.env.PORT = process.env.TEST_PORT ?? '0';
  process.env.DATABASE_CLIENT = 'sqlite';
  process.env.DATABASE_FILENAME = '.tmp/test.db';
  process.env.APP_KEYS = process.env.APP_KEYS ?? 'testkey1,testkey2,testkey3,testkey4';
  process.env.API_TOKEN_SALT = process.env.API_TOKEN_SALT ?? 'testapisalt1234567890';
  process.env.ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET ?? 'testadminjwtsecret123';
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'testjwtsecret12345678';
  process.env.TRANSFER_TOKEN_SALT = process.env.TRANSFER_TOKEN_SALT ?? 'testtransfersalt1234';
  process.env.BOOTSTRAP_PERMISSIONS = 'true';
};

export const setupStrapi = async (): Promise<Core.Strapi> => {
  if (!instance) {
    setTestEnv();
    instance = await createStrapi({
      appDir: path.resolve(__dirname, '../..'),
      distDir: path.resolve(__dirname, '../../dist'),
    }).load();
    await instance.start();
  }
  return instance;
};

export const teardownStrapi = async (): Promise<void> => {
  if (!instance) return;
  await instance.destroy();
  instance = null;
};
