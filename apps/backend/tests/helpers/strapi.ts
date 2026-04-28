import { createStrapi, type Core } from '@strapi/strapi';
import path from 'node:path';

let instance: Core.Strapi | null = null;

export const setupStrapi = async (): Promise<Core.Strapi> => {
  if (!instance) {
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
