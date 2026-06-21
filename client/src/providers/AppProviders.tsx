import { type ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { PersonalizationProvider } from '@/contexts/PersonalizationContext';
import { SymptomProvider } from '@/contexts/SymptomContext';
import { AuthBootstrap } from '@/components/auth/AuthBootstrap';

/**
 * Single provider tree for the entire app.
 * AuthProvider MUST wrap ThemeProvider, PersonalizationProvider, and SymptomProvider —
 * all three call useAuth() during render.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AuthBootstrap>
        <ThemeProvider>
          <PersonalizationProvider>
            <SymptomProvider>{children}</SymptomProvider>
          </PersonalizationProvider>
        </ThemeProvider>
      </AuthBootstrap>
    </AuthProvider>
  );
}
