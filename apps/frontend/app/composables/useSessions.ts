/**
 * Composable для управления сессиями устройств.
 *
 *   GET    /api/auth/sessions
 *   DELETE /api/auth/sessions/:id
 *   POST   /api/auth/sessions/revoke-others
 */
export interface DeviceSession {
  id: number;
  documentId: string;
  deviceId: string;
  name: string;
  platform: 'web' | 'ios' | 'android' | 'unknown';
  ipAddress: string;
  lastActiveAt: string;
  createdAt: string;
  current?: boolean;
}

export const useSessions = () => {
  const { $api } = useNuxtApp();

  const list = async (): Promise<DeviceSession[]> => {
    const res = await ($api as any)('/auth/sessions');
    return res?.data ?? [];
  };

  const revoke = async (documentId: string): Promise<DeviceSession | null> => {
    const res = await ($api as any)(`/auth/sessions/${documentId}`, { method: 'DELETE' });
    return res?.data ?? null;
  };

  const revokeOthers = async (): Promise<number> => {
    const res = await ($api as any)('/auth/sessions/revoke-others', { method: 'POST' });
    return res?.data?.revoked ?? 0;
  };

  return { list, revoke, revokeOthers };
};
