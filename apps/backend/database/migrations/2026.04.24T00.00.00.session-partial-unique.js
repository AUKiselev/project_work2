'use strict';

/**
 * Postgres partial unique index на сайдкаре Session.
 *
 * Гарантирует, что у одного пользователя может быть только одна
 * АКТИВНАЯ (revoked_at IS NULL) сессия на устройство (device_id).
 * Исторические revoked-строки не конфликтуют — допускается сколько
 * угодно записей на одно устройство, если они revoked.
 *
 * Уникальность на уровне схемы Strapi такого ограничения не выразит:
 * стандартный unique-constraint включает все строки, в т.ч. revoked.
 *
 * Идемпотентно: используем IF NOT EXISTS / IF EXISTS.
 */

const INDEX_NAME = 'sessions_user_device_active_unique';
const TABLE = 'sessions';

async function up(knex) {
  if (knex.client.config.client !== 'postgres') return;
  await knex.raw(
    `CREATE UNIQUE INDEX IF NOT EXISTS ?? ON ?? ("user_id", "device_id") WHERE "revoked_at" IS NULL`,
    [INDEX_NAME, TABLE]
  );
}

async function down(knex) {
  if (knex.client.config.client !== 'postgres') return;
  await knex.raw(`DROP INDEX IF EXISTS ??`, [INDEX_NAME]);
}

module.exports = { up, down };
