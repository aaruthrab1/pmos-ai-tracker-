import { SAKHI_WELCOME_MESSAGE } from '@/lib/sakhiFallbacks';
import { SAKHI_STARTER_PROMPTS, SAKHI_QUICK_ACTIONS, type SakhiLanguage } from '@/lib/sakhi';
import { SakhiAvatar } from './SakhiAvatar';
import { cn } from '@/lib/tokens';

interface SakhiWelcomeScreenProps {
  firstName?: string;
  activeLanguage: SakhiLanguage;
  onSelectLanguage: (lang: SakhiLanguage) => void;
  onPrompt: (prompt: string) => void;
  streaming: boolean;
  languageLabels: Record<SakhiLanguage, string>;
  allLanguages: SakhiLanguage[];
}

export function SakhiWelcomeScreen({
  firstName,
  activeLanguage,
  onSelectLanguage,
  onPrompt,
  streaming,
  languageLabels,
  allLanguages,
}: SakhiWelcomeScreenProps) {
  const prompts = SAKHI_STARTER_PROMPTS[activeLanguage] || SAKHI_QUICK_ACTIONS;

  return (
    <div className="flex flex-col items-center py-6 text-center animate-fade-in">
      <SakhiAvatar size="lg" className="mb-5" />
      <h2 className="font-display text-title text-ink">
        {firstName ? `Hi ${firstName}! I'm AI Sakhi 🌸` : "Hi! I'm AI Sakhi 🌸"}
      </h2>
      <p className="mt-3 max-w-sm whitespace-pre-line rounded-2xl border border-border bg-surface-secondary px-4 py-3 text-caption text-ink-secondary leading-relaxed">
        {SAKHI_WELCOME_MESSAGE.split('\n').slice(1).join('\n')}
      </p>

      <div className="mt-5 flex flex-wrap justify-center gap-1.5 max-w-sm">
        {allLanguages.map((lang) => (
          <button
            key={lang}
            type="button"
            onClick={() => onSelectLanguage(lang)}
            className={cn(
              'rounded-full px-2.5 py-1 text-micro font-medium transition-all',
              activeLanguage === lang
                ? 'chip-active'
                : 'bg-surface-secondary text-ink-tertiary hover:bg-surface-tertiary',
            )}
          >
            {languageLabels[lang]}
          </button>
        ))}
      </div>

      <div className="mt-6 w-full max-w-sm space-y-2 text-left">
        <p className="text-overline uppercase text-ink-muted px-1">Tap a question to get started</p>
        {prompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onPrompt(prompt)}
            disabled={streaming}
            className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-left text-caption font-medium text-ink transition-all hover:border-brand-300 hover:bg-brand-50 disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
