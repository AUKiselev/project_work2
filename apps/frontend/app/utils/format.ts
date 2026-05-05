// Форматирование цены, даты и диапазона дат для UI. Цены приходят
// с бэка в минимальных единицах (копейки) — делим на 100.

const RUB_FORMATTER = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
});

const DATE_FORMATTER_TIME = (tz: string) =>
  new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: tz,
  });

const DATE_FORMATTER_DAY = (tz: string) =>
  new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    timeZone: tz,
  });

const DATE_FORMATTER_DAY_YEAR = (tz: string) =>
  new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: tz,
  });

const TIME_FORMATTER = (tz: string) =>
  new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: tz,
  });

/** Нормализует все виды пробелов (U+00A0, U+202F и др.) к обычному U+0020 */
function normalizeSpaces(str: string): string {
  return str.replace(/[     ]/g, ' ');
}

// `currency` принимается для совместимости с расширением v2 на USD/EUR;
// на v1 поддерживается только RUB, поэтому параметр сейчас не используется.
export function formatPrice(amountMinor: number, currency: 'RUB'): string {
  if (amountMinor === 0) return 'Бесплатно';
  // Округляем до рублей: бэк хранит целые копейки.
  const rubles = Math.round(amountMinor / 100);
  return normalizeSpaces(RUB_FORMATTER.format(rubles));
}

export function formatDate(iso: string, tz = 'Europe/Moscow'): string {
  const d = new Date(iso);
  // ru-RU DateTimeFormat с датой и временем выдаёт что-то вроде:
  // "12 мая 2026 г., 13:00" или "12 мая 2026 г. в 13:00"
  // Нормализуем к виду "12 мая 2026, 13:00"
  let raw = DATE_FORMATTER_TIME(tz).format(d);
  raw = normalizeSpaces(raw);
  // Убираем " г." с возможной запятой и склейкой
  raw = raw.replace(' г.,', ',').replace(' г.', '');
  // Заменяем " в " (разделитель даты и времени) на ", "
  raw = raw.replace(' в ', ', ');
  return raw;
}

export function formatDateRange(
  startIso: string,
  endIso: string | undefined,
  tz = 'Europe/Moscow',
): string {
  if (!endIso) return formatDate(startIso, tz);
  const start = new Date(startIso);
  const end = new Date(endIso);
  const sameDay =
    start.toLocaleDateString('ru-RU', { timeZone: tz }) ===
    end.toLocaleDateString('ru-RU', { timeZone: tz });
  if (sameDay) {
    let dayPart = DATE_FORMATTER_DAY_YEAR(tz).format(start);
    dayPart = normalizeSpaces(dayPart).replace(' г.,', ',').replace(' г.', '');
    const startTime = normalizeSpaces(TIME_FORMATTER(tz).format(start));
    const endTime = normalizeSpaces(TIME_FORMATTER(tz).format(end));
    return `${dayPart}, ${startTime} — ${endTime}`;
  }
  const startDay = normalizeSpaces(DATE_FORMATTER_DAY(tz).format(start));
  let endDayYear = DATE_FORMATTER_DAY_YEAR(tz).format(end);
  endDayYear = normalizeSpaces(endDayYear).replace(' г.,', ',').replace(' г.', '');
  return `${startDay} — ${endDayYear}`;
}
