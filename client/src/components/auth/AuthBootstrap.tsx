import { type ReactNode, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { isDemoMode } from '@/lib/demoMode';

/**
 * Blocks route rendering until Supabase session restore finishes (or times out).
 * AuthProvider is mounted immediately so useAuth() is always available to descendants.
 */
export function AuthBootstrap({ children }: { children: ReactNode }) {
  const { loading } = useAuth();
  const [ready, setReady] = useState(!loading);

  useEffect(() => {
    if (!loading) setReady(true);
  }, [loading]);

  useEffect(() => {
    const timeoutMs = isDemoMode() ? 1500 : 5000;
    const timer = window.setTimeout(() => setReady(true), timeoutMs);
    return () => window.clearTimeout(timer);
  }, []);

  if (!ready && loading) {
    return <LoadingScreen message="Starting Cyra…" />;
  }

  return <>{children}</>;
}
