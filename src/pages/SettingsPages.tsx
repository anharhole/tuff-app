import React from 'react';
import { Accessibility, Check, Globe, Languages, RotateCcw, WifiOff } from 'lucide-react';
import type { LanguageCode } from '../../shared/types.ts';
import { useApp } from '../context/AppContext.tsx';

export const AccessibilitySettingsPage: React.FC = () => {
  const { accessibility, updateAccessibility, language, lowInternetMode, setLowInternetMode, showToast } =
    useApp();

  const resetAll = async () => {
    await updateAccessibility({
      fontScale: 'normal',
      highContrast: false,
      reducedMotion: false,
      largeTargets: false,
      screenReaderHints: true,
      preferredVoiceLang: language,
      chatAutoTranslateTo: 'off',
    });
    setLowInternetMode(false);
    showToast('Accessibility settings restored to defaults', 'info');
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-6">
      <div className="rounded-xl border border-[#E4E1D8] bg-white p-6 sm:p-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#134E3A]">
            <Accessibility className="h-4 w-4 text-[#B68A1E]" />
            <span>Accessibility Mode</span>
          </div>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-[#181A18]">
            Readable, Comfortable Marketplace Controls
          </h1>
          <p className="mt-1.5 text-sm text-[#5A605A]">
            Preferences save across sessions for your account and browser. Adjust text size, contrast, touch target sizing, and motion comfort below.
          </p>
        </div>

        <button
          type="button"
          onClick={resetAll}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#E4E1D8] px-3.5 py-2 text-xs font-semibold text-[#5A605A] hover:text-[#181A18]"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Reset Defaults</span>
        </button>
      </div>

      {/* Text Size */}
      <div className="rounded-xl border border-[#E4E1D8] bg-white p-6 space-y-4">
        <div>
          <h2 className="font-display text-lg font-bold text-[#181A18]">Text & Heading Scale</h2>
          <p className="text-xs text-[#5A605A]">
            Increases base font size across service cards, quotations, and chat messages.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {(
            [
              { id: 'normal', label: 'Standard (100%)', sample: '16px base' },
              { id: 'large', label: 'Large (112%)', sample: '18px base' },
              { id: 'xlarge', label: 'Extra Large (125%)', sample: '20px base' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => updateAccessibility({ fontScale: opt.id })}
              className={`rounded-xl border p-4 text-left transition-colors ${
                accessibility.fontScale === opt.id
                  ? 'border-[#134E3A] bg-[#E6F2EC]/60'
                  : 'border-[#E4E1D8] bg-[#F8F7F4] hover:border-[#134E3A]/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[#181A18]">{opt.label}</span>
                {accessibility.fontScale === opt.id && (
                  <Check className="h-4 w-4 text-[#134E3A]" />
                )}
              </div>
              <div className="mt-1 text-xs text-[#5A605A]">{opt.sample}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Toggles */}
      <div className="rounded-xl border border-[#E4E1D8] bg-white divide-y divide-[#E4E1D8]">
        {[
          {
            key: 'highContrast' as const,
            title: 'High Contrast Mode',
            desc: 'Sharpens text-to-background contrast and borders without breaking buttons or badges.',
            checked: accessibility.highContrast,
            onChange: (v: boolean) => updateAccessibility({ highContrast: v }),
          },
          {
            key: 'reducedMotion' as const,
            title: 'Reduced Motion & Instant Splash',
            desc: 'Minimizes animations and skips splash screen transitions automatically.',
            checked: accessibility.reducedMotion,
            onChange: (v: boolean) => updateAccessibility({ reducedMotion: v }),
          },
          {
            key: 'largeTargets' as const,
            title: 'Larger Touch Targets',
            desc: 'Expands minimum height of interactive buttons, form fields, and links to at least 46px.',
            checked: accessibility.largeTargets,
            onChange: (v: boolean) => updateAccessibility({ largeTargets: v }),
          },
          {
            key: 'screenReaderHints' as const,
            title: 'Spoken Guidance & Screen Reader Hints',
            desc: 'Enables spoken Text-to-Speech cues in LocalConnect AI and enhanced ARIA labels.',
            checked: accessibility.screenReaderHints,
            onChange: (v: boolean) => updateAccessibility({ screenReaderHints: v }),
          },
          {
            key: 'chatAutoTranslateTo' as const,
            title: 'Auto-Translate Chat Messages',
            desc: 'Automatically translates incoming English, Malayalam, and Hindi chat messages into your active language.',
            checked: accessibility.chatAutoTranslateTo !== 'off',
            onChange: (v: boolean) =>
              updateAccessibility({ chatAutoTranslateTo: v ? language : 'off' }),
          },
          {
            key: 'lowInternet' as const,
            title: 'Low-Internet Data Saver Mode',
            desc: 'Reduces image weight for slower rural mobile networks across Kerala.',
            checked: lowInternetMode,
            onChange: (v: boolean) => setLowInternetMode(v),
          },
        ].map((item) => (
          <label
            key={item.key}
            className="flex items-center justify-between gap-4 p-5 cursor-pointer hover:bg-[#F8F7F4]/60"
          >
            <div>
              <div className="text-sm font-semibold text-[#181A18]">{item.title}</div>
              <div className="text-xs text-[#5A605A] mt-0.5">{item.desc}</div>
            </div>
            <input
              type="checkbox"
              checked={item.checked}
              onChange={(e) => item.onChange(e.target.checked)}
              className="h-5 w-5 accent-[#134E3A] shrink-0"
            />
          </label>
        ))}
      </div>
    </div>
  );
};

export const LanguageSettingsPage: React.FC = () => {
  const { language, setLanguage, accessibility, updateAccessibility, lowInternetMode, setLowInternetMode } =
    useApp();

  const langs: Array<{
    code: LanguageCode;
    name: string;
    native: string;
    desc: string;
  }> = [
    {
      code: 'en',
      name: 'English',
      native: 'English (India)',
      desc: 'Default interface labels, Kerala town names, and English chat translations.',
    },
    {
      code: 'ml',
      name: 'Malayalam',
      native: 'മലയാളം',
      desc: 'Malayalam navigation, category names, Voice AI (ml-IN), and automatic chat translator.',
    },
    {
      code: 'hi',
      name: 'Hindi',
      native: 'हिन्दी',
      desc: 'Hindi navigation, service labels, Voice AI (hi-IN), and automatic chat translator.',
    },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-6">
      <div className="rounded-xl border border-[#E4E1D8] bg-white p-6 sm:p-8">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#134E3A]">
          <Globe className="h-4 w-4 text-[#B68A1E]" />
          <span>Language & Regional Settings</span>
        </div>
        <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-[#181A18]">
          Choose Your Preferred Language
        </h1>
        <p className="mt-1.5 text-sm text-[#5A605A]">
          LocalConnect supports English, Malayalam, and Hindi across marketplace discovery, AI Voice Assistant, and bidirectional customer-provider chat translation.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {langs.map((item) => (
          <button
            key={item.code}
            type="button"
            onClick={() => setLanguage(item.code)}
            className={`rounded-xl border p-5 text-left space-y-2 transition-colors ${
              language === item.code
                ? 'border-[#134E3A] bg-[#E6F2EC]/60'
                : 'border-[#E4E1D8] bg-white hover:border-[#134E3A]/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-display text-lg font-bold text-[#181A18]">{item.native}</span>
              {language === item.code && <Check className="h-5 w-5 text-[#134E3A]" />}
            </div>
            <div className="text-xs font-semibold text-[#134E3A]">{item.name}</div>
            <p className="text-xs text-[#5A605A] leading-relaxed">{item.desc}</p>
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-[#E4E1D8] bg-white divide-y divide-[#E4E1D8]">
        <label className="flex items-center justify-between gap-4 p-5 cursor-pointer">
          <div className="flex items-start gap-3">
            <Languages className="h-5 w-5 text-[#134E3A] mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-[#181A18]">
                Automatic Chat Translation ({language.toUpperCase()})
              </div>
              <div className="text-xs text-[#5A605A]">
                Automatically translates incoming customer/provider messages into {language === 'ml' ? 'Malayalam' : language === 'hi' ? 'Hindi' : 'English'} while keeping a "Show Original" toggle.
              </div>
            </div>
          </div>
          <input
            type="checkbox"
            checked={accessibility.chatAutoTranslateTo !== 'off'}
            onChange={(e) =>
              updateAccessibility({ chatAutoTranslateTo: e.target.checked ? language : 'off' })
            }
            className="h-5 w-5 accent-[#134E3A]"
          />
        </label>

        <label className="flex items-center justify-between gap-4 p-5 cursor-pointer">
          <div className="flex items-start gap-3">
            <WifiOff className="h-5 w-5 text-[#5A605A] mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-[#181A18]">Low-Internet Data Saver</div>
              <div className="text-xs text-[#5A605A]">
                Minimizes non-essential photos for reliable loading over slower mobile networks.
              </div>
            </div>
          </div>
          <input
            type="checkbox"
            checked={lowInternetMode}
            onChange={(e) => setLowInternetMode(e.target.checked)}
            className="h-5 w-5 accent-[#134E3A]"
          />
        </label>
      </div>
    </div>
  );
};
