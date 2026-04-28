// Stub типов Strapi — расширяется в Task 6.
export interface StrapiSingle<T> { data: T | null }
export interface StrapiCollection<T> {
  data: T[];
  meta?: { pagination?: { page: number; pageSize: number; pageCount: number; total: number } };
}
export interface StrapiErrorEnvelope {
  error: {
    status: number;
    name: string;
    message: string;
    details?: { errors?: Array<{ path: string[]; message: string; name?: string }> };
  };
}
