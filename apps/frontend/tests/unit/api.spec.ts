import { describe, it, expect } from 'vitest';
import { unwrapStrapi, parseStrapiError } from '~/utils/api';

describe('unwrapStrapi', () => {
  it('single → объект', () => {
    expect(unwrapStrapi({ data: { id: 1, slug: 'x' } })).toEqual({ id: 1, slug: 'x' });
  });
  it('collection → массив', () => {
    expect(unwrapStrapi({ data: [{ id: 1 }, { id: 2 }] })).toEqual([{ id: 1 }, { id: 2 }]);
  });
  it('null single → бросает 404', () => {
    expect(() => unwrapStrapi({ data: null })).toThrowError(/not found/i);
  });
});

describe('parseStrapiError', () => {
  it('validation 400 с details.errors → fields', () => {
    const err = {
      response: { status: 400 },
      data: {
        error: {
          status: 400, name: 'ValidationError', message: 'Validation failed',
          details: { errors: [{ path: ['email'], message: 'invalid email' }] },
        },
      },
    };
    const out = parseStrapiError(err);
    expect(out.status).toBe(400);
    expect(out.message).toBe('Validation failed');
    expect(out.fields).toEqual({ email: 'invalid email' });
  });
  it('401 без details → status+message', () => {
    const err = { response: { status: 401 }, data: { error: { status: 401, name: 'UnauthorizedError', message: 'Invalid credentials' } } };
    const out = parseStrapiError(err);
    expect(out.status).toBe(401);
    expect(out.message).toBe('Invalid credentials');
    expect(out.fields).toBeUndefined();
  });
  it('сетевая ошибка без response → status=0', () => {
    const out = parseStrapiError(new Error('Network down'));
    expect(out.status).toBe(0);
    expect(out.message).toMatch(/network|down|ошибк/i);
  });
});
