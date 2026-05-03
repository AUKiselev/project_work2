/**
 * dev-seed.ts — идемпотентный засев тестовых данных для dev-окружения.
 *
 * Запускается только при SEED_DEV=true (см. apps/backend/src/index.ts).
 * Никогда не запускается в production.
 *
 * Все операции через Strapi 5 Document Service (strapi.documents).
 * Идемпотентность: перед созданием сущности проверяется её наличие по
 * уникальному полю (slug / code / name).
 */

export async function seedDev(strapi: any): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    strapi.log.warn('seed: seedDev skipped in production');
    return;
  }

  strapi.log.info('seed: starting dev seed...');

  const now = new Date();

  const daysFromNow = (days: number): string => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    return d.toISOString();
  };

  // ─── 1. Organizer ──────────────────────────────────────────────────────────

  let organizer = await strapi
    .documents('api::organizer.organizer')
    .findFirst({ filters: { name: 'Клуб Спикеров' } });

  if (organizer) {
    strapi.log.info('seed: skipped organizer "Клуб Спикеров"');
  } else {
    organizer = await strapi.documents('api::organizer.organizer').create({
      data: {
        name: 'Клуб Спикеров',
        description:
          'Организация профессиональных конференций и митапов для IT-сообщества. ' +
          'Объединяем экспертов, практиков и всех, кто хочет учиться и делиться опытом.',
      },
      status: 'published',
    });
    strapi.log.info('seed: created organizer "Клуб Спикеров"');
  }

  // ─── 2. Venue ──────────────────────────────────────────────────────────────

  let venue = await strapi
    .documents('api::venue.venue')
    .findFirst({ filters: { name: 'БЦ Сириус, конференц-зал 1' } });

  if (venue) {
    strapi.log.info('seed: skipped venue "БЦ Сириус, конференц-зал 1"');
  } else {
    venue = await strapi.documents('api::venue.venue').create({
      data: {
        name: 'БЦ Сириус, конференц-зал 1',
        address: 'Москва, ул. Академика Королёва, д. 12, стр. 1, БЦ Сириус',
        lat: 55.8225,
        lng: 37.6177,
      },
    });
    strapi.log.info('seed: created venue "БЦ Сириус, конференц-зал 1"');
  }

  // ─── 3. Speakers ───────────────────────────────────────────────────────────

  const speakerDefs = [
    {
      slug: 'ivan-petrov',
      fullName: 'Иван Петров',
      bio: 'Иван — технический директор крупной финтех-компании с 12-летним опытом в разработке высоконагруженных систем. Специализируется на архитектуре микросервисов, DevOps и масштабировании продуктов. Регулярный спикер профильных конференций.',
      social: { telegram: 'https://t.me/ivan_petrov_dev', linkedin: '' },
    },
    {
      slug: 'maria-smirnova',
      fullName: 'Мария Смирнова',
      bio: 'Мария — продуктовый директор с опытом запуска более 10 цифровых продуктов. Эксперт в области customer development, unit-экономики и построения продуктовых команд. Ментор акселератора ФРИИ.',
      social: { telegram: 'https://t.me/maria_product', linkedin: '' },
    },
    {
      slug: 'aleksei-kuznetsov',
      fullName: 'Алексей Кузнецов',
      bio: 'Алексей — инженер-практик в области машинного обучения и больших данных. Работает в сфере рекомендательных систем и NLP. Автор открытых библиотек с тысячами звёзд на GitHub.',
      social: { telegram: 'https://t.me/aleksei_ml', linkedin: '' },
    },
  ];

  const speakers: any[] = [];

  for (const def of speakerDefs) {
    let speaker = await strapi
      .documents('api::speaker.speaker')
      .findFirst({ filters: { slug: def.slug } });

    if (speaker) {
      strapi.log.info(`seed: skipped speaker "${def.fullName}"`);
    } else {
      speaker = await strapi.documents('api::speaker.speaker').create({
        data: {
          slug: def.slug,
          fullName: def.fullName,
          bio: def.bio,
          social: def.social,
        },
        status: 'published',
      });
      strapi.log.info(`seed: created speaker "${def.fullName}"`);
    }

    speakers.push(speaker);
  }

  // ─── 4. Categories ─────────────────────────────────────────────────────────

  const categorySeedDefs = [
    { slug: 'meetup', title: 'Митап', colorToken: 'sky' as const },
    { slug: 'conference', title: 'Конференция', colorToken: 'primary' as const },
    { slug: 'workshop', title: 'Воркшоп', colorToken: 'emerald' as const },
    { slug: 'lecture', title: 'Лекция', colorToken: 'violet' as const },
  ];

  const categoriesBySlug: Record<string, { documentId: string }> = {};

  for (const seed of categorySeedDefs) {
    const existingCategory = await strapi
      .documents('api::category.category')
      .findFirst({ filters: { slug: seed.slug } });

    if (existingCategory) {
      strapi.log.info(`seed: skipped category "${seed.slug}" (exists)`);
      categoriesBySlug[seed.slug] = { documentId: existingCategory.documentId };
    } else {
      // Category — single-version (draftAndPublish: false), опция status здесь не нужна.
      const created = await strapi.documents('api::category.category').create({
        data: seed,
      });
      strapi.log.info(`seed: created category "${seed.slug}"`);
      categoriesBySlug[seed.slug] = { documentId: created.documentId };
    }
  }

  // ─── 5. Events ─────────────────────────────────────────────────────────────

  const eventDefs = [
    {
      slug: 'tech-meetup-spring-2026',
      title: 'Tech Meetup: Весна 2026',
      categorySlug: 'meetup',
      shortDescription:
        'Весенний митап для разработчиков и архитекторов: высоконагруженные системы, современные инструменты, живые кейсы из продакшена.',
      description:
        'Приглашаем разработчиков, тимлидов и архитекторов на ежегодный весенний митап Клуба Спикеров.\n\n' +
        'В программе: доклады о высоконагруженных системах, практика DevOps, архитектурные кейсы крупнейших российских IT-компаний. ' +
        'Формат живого общения, нетворкинг и разбор реальных задач после докладов.\n\n' +
        'Места ограничены — бронируй билет заранее.',
      startsAt: daysFromNow(14),
      endsAt: daysFromNow(14).replace('T', 'T').replace(/T(\d{2})/, (_m: string, h: string) => `T${String(Number(h) + 6).padStart(2, '0')}`),
      speakerIndices: [0, 1],
    },
    {
      slug: 'product-conference-2026',
      title: 'Product Conference 2026',
      categorySlug: 'conference',
      shortDescription:
        'Конференция для продакт-менеджеров и лидеров роста: стратегия, метрики, команды и реальный опыт запуска продуктов.',
      description:
        'Product Conference 2026 — однодневная конференция для всех, кто строит цифровые продукты.\n\n' +
        'Темы: unit-экономика в условиях неопределённости, построение продуктовых гипотез, работа с данными и ML в продукте, ' +
        'лидерство и масштабирование команд. Спикеры — практики с опытом запуска продуктов в России и за рубежом.\n\n' +
        'После основной программы — открытая панельная дискуссия и нетворкинг-сессия.',
      startsAt: daysFromNow(30),
      endsAt: daysFromNow(30).replace(/T(\d{2})/, (_m: string, h: string) => `T${String(Number(h) + 8).padStart(2, '0')}`),
      speakerIndices: [1, 2],
    },
  ];

  const createdEvents: any[] = [];

  for (const def of eventDefs) {
    const categoryDocumentId = def.categorySlug ? categoriesBySlug[def.categorySlug]?.documentId : undefined;

    // Читаем published-версию (она видна через публичный API)
    let event = await strapi
      .documents('api::event.event')
      .findFirst({ filters: { slug: def.slug }, populate: { category: true }, status: 'published' });

    if (event) {
      strapi.log.info(`seed: skipped event "${def.title}"`);
      // Привязываем категорию к уже существующему event'у, если она ещё не задана в published-версии
      if (categoryDocumentId && !(event as any).category) {
        // update с status: 'published' обновляет напрямую опубликованную версию
        await strapi.documents('api::event.event').update({
          documentId: event.documentId,
          data: { category: categoryDocumentId },
          status: 'published',
        });
        strapi.log.info(`seed: event "${def.slug}" attached to category "${def.categorySlug}"`);
      }
    } else {
      const eventSpeakers = def.speakerIndices.map((i: number) => speakers[i].documentId);

      event = await strapi.documents('api::event.event').create({
        data: {
          slug: def.slug,
          title: def.title,
          shortDescription: def.shortDescription,
          description: def.description,
          startsAt: def.startsAt,
          endsAt: def.endsAt,
          timezone: 'Europe/Moscow',
          capacity: 100,
          status: 'published',
          venue: venue.documentId,
          organizer: organizer.documentId,
          speakers: eventSpeakers,
          ...(categoryDocumentId ? { category: categoryDocumentId } : {}),
        },
        status: 'published',
      });
      strapi.log.info(`seed: created event "${def.title}"`);
    }

    createdEvents.push(event);
  }

  // ─── 6. Ticket Tiers ───────────────────────────────────────────────────────

  const tierDefs = [
    { name: 'Стандарт', price: 1500, sortOrder: 1, description: 'Доступ на все доклады, кофе-пауза, электронные материалы.' },
    { name: 'VIP', price: 5000, sortOrder: 2, description: 'Все включено из Стандарта + приоритетные места в первом ряду, именной бейдж, обед с докладчиками и сувенирный набор.' },
  ];

  for (const event of createdEvents) {
    for (const tierDef of tierDefs) {
      const existing = await strapi
        .documents('api::ticket-tier.ticket-tier')
        .findFirst({ filters: { name: tierDef.name, event: { documentId: event.documentId } } });

      if (existing) {
        strapi.log.info(`seed: skipped tier "${tierDef.name}" for event "${event.slug ?? event.documentId}"`);
        continue;
      }

      await strapi.documents('api::ticket-tier.ticket-tier').create({
        data: {
          name: tierDef.name,
          description: tierDef.description,
          price: tierDef.price,
          currency: 'RUB',
          sortOrder: tierDef.sortOrder,
          event: event.documentId,
        },
      });
      strapi.log.info(`seed: created tier "${tierDef.name}" for event "${event.slug ?? event.documentId}"`);
    }
  }

  // ─── 7. Banner ─────────────────────────────────────────────────────────────

  let banner = await strapi
    .documents('api::banner.banner')
    .findFirst({ filters: { title: 'Tech Meetup: Весна 2026 — регистрация открыта' } });

  if (banner) {
    strapi.log.info('seed: skipped banner');
  } else {
    const activeFrom = new Date(now);
    activeFrom.setDate(activeFrom.getDate() - 1);

    const activeUntil = new Date(now);
    activeUntil.setDate(activeUntil.getDate() + 90);

    // image — обязательное поле в схеме (required: true).
    // В dev-режиме без загруженных медиафайлов баннер создаётся без image,
    // что может вызвать ошибку валидации Strapi. Обрабатываем это gracefully.
    try {
      banner = await strapi.documents('api::banner.banner').create({
        data: {
          title: 'Tech Meetup: Весна 2026 — регистрация открыта',
          url: '/events/tech-meetup-spring-2026',
          priority: 10,
          activeFrom: activeFrom.toISOString(),
          activeUntil: activeUntil.toISOString(),
          event: createdEvents[0]?.documentId ?? null,
        },
        status: 'published',
      });
      strapi.log.info('seed: created banner');
    } catch (err: any) {
      strapi.log.warn(`seed: banner creation skipped — ${err?.message ?? String(err)}. ` +
        'Upload an image and re-run seed to create the banner.');
    }
  }

  // ─── 8. Promo Code ─────────────────────────────────────────────────────────

  let promo = await strapi
    .documents('api::promo-code.promo-code')
    .findFirst({ filters: { code: 'WELCOME10' } });

  if (promo) {
    strapi.log.info('seed: skipped promo-code "WELCOME10"');
  } else {
    const validUntil = new Date(now);
    validUntil.setDate(validUntil.getDate() + 90);

    await strapi.documents('api::promo-code.promo-code').create({
      data: {
        code: 'WELCOME10',
        discountType: 'percent',
        discountValue: 10,
        validFrom: now.toISOString(),
        validUntil: validUntil.toISOString(),
        maxUses: 100,
        usedCount: 0,
      },
    });
    strapi.log.info('seed: created promo-code "WELCOME10"');
  }

  // ─── 9. Agenda Items ───────────────────────────────────────────────────────

  // Вспомогательная функция: добавить часы к ISO-строке даты
  const addHours = (isoStr: string, hours: number): string => {
    const d = new Date(isoStr);
    d.setTime(d.getTime() + hours * 60 * 60 * 1000);
    return d.toISOString();
  };

  // Описания agenda для каждого события (индексы спикеров из массива speakers)
  const agendaDefs: Array<{
    eventIndex: number;
    items: Array<{
      title: string;
      description: string;
      offsetStartHours: number;
      durationHours: number;
      speakerIndices: number[];
    }>;
  }> = [
    {
      eventIndex: 0, // tech-meetup-spring-2026
      items: [
        {
          title: 'Открытие. Архитектура высоконагруженных систем: опыт продакшена',
          description:
            'Иван Петров расскажет об архитектурных решениях при масштабировании сервисов до миллионов запросов в сутки: выбор между монолитом и микросервисами, подводные камни распределённых транзакций.',
          offsetStartHours: 0,
          durationHours: 1,
          speakerIndices: [0],
        },
        {
          title: 'DevOps-практика: CI/CD без боли и потерь',
          description:
            'Разбираем построение надёжного пайплайна: GitOps, канарейки, feature-флаги. Реальные кейсы из крупных российских IT-компаний.',
          offsetStartHours: 1.25,
          durationHours: 1,
          speakerIndices: [0, 1],
        },
        {
          title: 'Нетворкинг и Q&A-сессия',
          description:
            'Открытое общение с докладчиками, разбор вопросов из зала, демонстрация инструментов.',
          offsetStartHours: 2.5,
          durationHours: 1,
          speakerIndices: [0, 1],
        },
      ],
    },
    {
      eventIndex: 1, // product-conference-2026
      items: [
        {
          title: 'Unit-экономика в условиях неопределённости',
          description:
            'Мария Смирнова — о том, как считать юнит-экономику, когда рынок нестабилен: ключевые метрики, антипаттерны и реальные формулы из запущенных продуктов.',
          offsetStartHours: 0,
          durationHours: 1,
          speakerIndices: [1],
        },
        {
          title: 'ML в продукте: от эксперимента до продакшена',
          description:
            'Алексей Кузнецов — практика внедрения рекомендательных систем и NLP-моделей в продукт без научного отдела: инструменты, метрики и типичные ошибки.',
          offsetStartHours: 1.5,
          durationHours: 1,
          speakerIndices: [2],
        },
        {
          title: 'Панельная дискуссия и нетворкинг',
          description:
            'Открытая панель: спикеры отвечают на вопросы аудитории, обсуждают тренды рынка и делятся инсайтами.',
          offsetStartHours: 3,
          durationHours: 1.5,
          speakerIndices: [1, 2],
        },
      ],
    },
  ];

  for (const agendaDef of agendaDefs) {
    const event = createdEvents[agendaDef.eventIndex];
    if (!event) continue;

    // Получаем актуальный event с полем startsAt
    const eventFull = await strapi
      .documents('api::event.event')
      .findFirst({ filters: { documentId: event.documentId } });

    const eventStartsAt: string = eventFull?.startsAt ?? event.startsAt ?? new Date().toISOString();

    for (const item of agendaDef.items) {
      const itemStartsAt = addHours(eventStartsAt, item.offsetStartHours);
      const itemEndsAt = addHours(eventStartsAt, item.offsetStartHours + item.durationHours);

      // Идемпотентность: ищем по title + event
      const existing = await strapi
        .documents('api::agenda-item.agenda-item')
        .findFirst({ filters: { title: item.title, event: { documentId: event.documentId } } });

      if (existing) {
        strapi.log.info(`seed: skipped agenda-item "${item.title}" for event "${event.slug ?? event.documentId}"`);
        continue;
      }

      const itemSpeakers = item.speakerIndices.map((i: number) => speakers[i].documentId);

      await strapi.documents('api::agenda-item.agenda-item').create({
        data: {
          title: item.title,
          description: item.description,
          startsAt: itemStartsAt,
          endsAt: itemEndsAt,
          event: event.documentId,
          speakers: itemSpeakers,
        },
      });
      strapi.log.info(`seed: created agenda-item "${item.title}" for event "${event.slug ?? event.documentId}"`);
    }
  }

  // ─── 10. Mock Tickets (для AvailabilityBadge) ─────────────────────────────

  const MOCK_TICKETS_PLAN = [
    { eventSlug: 'tech-meetup-spring-2026', count: 30 },
    { eventSlug: 'product-conference-2026', count: 85 },
  ];

  for (const plan of MOCK_TICKETS_PLAN) {
    const event = await strapi.documents('api::event.event').findFirst({
      filters: { slug: plan.eventSlug },
      populate: { tiers: true },
      status: 'published',
    });
    if (!event) {
      strapi.log.warn(`seed: mock-tickets ${plan.eventSlug}: event not found, skip`);
      continue;
    }
    const existingCount = await strapi.db.query('api::ticket.ticket').count({
      where: {
        event: { documentId: event.documentId },
        number: { $startsWith: `MOCK-${plan.eventSlug}-` },
      },
    });
    if (existingCount >= plan.count) {
      strapi.log.info(`seed: mock-tickets ${plan.eventSlug}: ${existingCount}/${plan.count} already present, skip`);
      continue;
    }
    const tiers = ((event as any).tiers ?? []) as Array<{ documentId: string }>;
    if (tiers.length === 0) {
      strapi.log.warn(`seed: mock-tickets ${plan.eventSlug}: no tiers, skip`);
      continue;
    }
    const toCreate = plan.count - existingCount;
    for (let i = existingCount; i < plan.count; i++) {
      const tier = tiers[i % tiers.length];
      await strapi.documents('api::ticket.ticket').create({
        data: {
          number: `MOCK-${plan.eventSlug}-${i}`,
          qrPayload: `mock-qr-${plan.eventSlug}-${i}`,
          status: 'valid',
          attendee: { fullName: `Гость ${i + 1}`, email: `guest${i}@example.com` },
          event: event.documentId,
          tier: tier.documentId,
        },
      });
    }
    strapi.log.info(`seed: mock-tickets ${plan.eventSlug}: created ${toCreate}`);
  }

  strapi.log.info('seed: dev seed complete');
}
