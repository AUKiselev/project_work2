// Хелперы для работы с REST-ответами Strapi 5.
import type { StrapiCollection, StrapiSingle, StrapiErrorEnvelope } from '~/types/api';

export interface ParsedApiError {
  status: number;
  code: string;
  message: string;
  fields?: Record<string, string>;
}

export function unwrapStrapi<T>(res: StrapiSingle<T>): T;
export function unwrapStrapi<T>(res: StrapiCollection<T>): T[];
export function unwrapStrapi<T>(res: StrapiSingle<T> | StrapiCollection<T>): T | T[] {
  const data = (res as { data: unknown }).data;
  if (data === null || data === undefined) {
    const err: any = new Error('Resource not found');
    err.statusCode = 404;
    throw err;
  }
  return data as any;
}

export function parseStrapiError(err: unknown): ParsedApiError {
  const anyErr = err as any;
  const status: number =
    anyErr?.response?.status ?? anyErr?.statusCode ?? 0;
  const envelope: StrapiErrorEnvelope | undefined = anyErr?.data ?? anyErr?.response?._data;
  const errorObj = envelope?.error;

  if (errorObj) {
    const fields: Record<string, string> | undefined = errorObj.details?.errors?.length
      ? Object.fromEntries(
          errorObj.details.errors.map((e) => [e.path.join('.'), e.message]),
        )
      : undefined;
    return {
      status,
      code: errorObj.name || 'UnknownError',
      message: errorObj.message || 'Что-то пошло не так',
      fields,
    };
  }

  if (status === 0) {
    return {
      status: 0,
      code: 'NetworkError',
      message: anyErr?.message || 'Сетевая ошибка',
    };
  }

  return { status, code: 'UnknownError', message: anyErr?.message || 'Что-то пошло не так' };
}
