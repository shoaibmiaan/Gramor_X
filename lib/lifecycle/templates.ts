// lib/lifecycle/templates.ts
// Shared messaging copy for lifecycle email + WhatsApp notifications.

export type LifecycleEventType = 'first_mock_done' | 'band_up' | 'streak_broken';

export type LifecycleTemplateInput = {
  name?: string | null;
  locale?: string | null;
  context?: Record<string, unknown> | null | undefined;
};

export type LifecycleChannelTemplate = {
  subject: string;
  text: string;
  html?: string | null;
};

export type LifecycleRenderedTemplate = {
  locale: string;
  email: LifecycleChannelTemplate;
  whatsapp: { text: string };
};

type TemplateBuilder = (
  event: LifecycleEventType,
  input: LifecycleTemplateInput,
  locale: 'en' | 'ur',
) => LifecycleRenderedTemplate;

function pickLocale(candidate?: string | null): 'en' | 'ur' {
  if (!candidate) return 'en';
  const normalized = candidate.toLowerCase();
  if (normalized.startsWith('ur') || normalized.includes('urdu')) {
    return 'ur';
  }
  return 'en';
}

function friendlyName(name?: string | null): string {
  if (!name) return 'there';
  return name.trim().split(' ')[0] || 'there';
}

function extractNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return null;
}

function extractUrl(context?: Record<string, unknown> | null): string | null {
  if (!context) return null;
  const candidate = context.url ?? context.link ?? context.href ?? null;
  if (typeof candidate === 'string' && candidate.trim().length > 0) {
    return candidate.trim();
  }
  return null;
}

function renderFirstMock(
  event: LifecycleEventType,
  input: LifecycleTemplateInput,
  locale: 'en' | 'ur',
): LifecycleRenderedTemplate {
  const name = friendlyName(input.name);
  const url = extractUrl(input.context);

  if (locale === 'ur') {
    const emailLines = [
      `سلام ${name}!`,
      '',
      'آپ نے اپنا پہلا موک ٹیسٹ مکمل کر لیا ہے — کمال کی شروعات! فیڈبیک دیکھیں اور اگلا پلان کریں۔',
    ];
    if (url) {
      emailLines.push('', `نتائج یہاں دیکھیں: ${url}`);
    }
    emailLines.push('', 'جاری رکھیں،', 'GramorX ٹیم');

    const whatsapp = url
      ? `🔥 زبردست ${name}! پہلا موک ختم۔ فیڈبیک یہاں دیکھیں: ${url}`
      : `🔥 زبردست ${name}! پہلا موک ختم۔ فیڈبیک چیک کریں اور اگلا قدم لیں۔`;

    return {
      locale,
      email: {
        subject: 'پہلا موک مکمل — شاباش!',
        text: emailLines.join('\n'),
      },
      whatsapp: { text: whatsapp },
    };
  }

  const emailLines = [
    `Hi ${name},`,
    '',
    'You just wrapped your first mock test — amazing momentum! Review what went well and plan the next step while it’s fresh.',
  ];
  if (url) {
    emailLines.push('', `See your feedback here: ${url}`);
  }
  emailLines.push('', 'Keep going,', 'Team GramorX');

  const whatsapp = url
    ? `🔥 Nice work ${name}! Your first mock is done. Check the feedback: ${url}`
    : `🔥 Nice work ${name}! Your first mock is done. Jump back in for the next practice when you’re ready.`;

  return {
    locale,
    email: {
      subject: 'You finished your first mock! 🎉',
      text: emailLines.join('\n'),
    },
    whatsapp: { text: whatsapp },
  };
}

function renderBandUp(
  event: LifecycleEventType,
  input: LifecycleTemplateInput,
  locale: 'en' | 'ur',
): LifecycleRenderedTemplate {
  const name = friendlyName(input.name);
  const ctx = input.context ?? {};
  const band = extractNumber((ctx as Record<string, unknown>).band ?? ctx.targetBand ?? ctx.toBand);
  const previous = extractNumber((ctx as Record<string, unknown>).previousBand ?? ctx.fromBand);
  const delta = band !== null && previous !== null ? band - previous : null;
  const url = extractUrl(ctx as Record<string, unknown>);

  if (locale === 'ur') {
    const subject = band ? `🎯 Band ${band} تک پہنچ گئے!` : '🎯 نیا بینڈ حاصل ہوا!';
    const body: string[] = [
      `سلام ${name}!`,
      '',
      band
        ? `مبارک ہو — آپ اب Band ${band} پر ہیں!`
        : 'مبارک ہو — آپ نے اپنی تحریری بینڈ اسکور میں اضافہ کیا ہے!',
    ];
    if (delta && delta > 0) {
      body.push(`یہ ${delta.toFixed(1)} پوائنٹ کی بہتری ہے۔`);
    }
    body.push('اس رفتار کو برقرار رکھیں اور اگلے مقصد کیلئے منصوبہ بنائیں۔');
    if (url) {
      body.push('', `اپنی تیاری جاری رکھیں: ${url}`);
    }
    body.push('', 'GramorX ٹیم');

    const whatsapp = url
      ? `🎯 زبردست ${name}! Band ${band ?? ''} تک پہنچ گئے۔ اگلے سبق کیلئے یہاں جائیں: ${url}`.trim()
      : `🎯 زبردست ${name}! نئی بینڈ میں اپ گریڈ۔ اگلا سبق لاک کریں۔`;

    return {
      locale,
      email: { subject, text: body.join('\n') },
      whatsapp: { text: whatsapp },
    };
  }

  const subject = band ? `🎯 Band ${band} unlocked!` : '🎯 You moved up a band!';
  const body: string[] = [
    `Hi ${name},`,
    '',
    band
      ? `Huge congrats — you’re now tracking at Band ${band}!`
      : 'Huge congrats — your band score just moved up!',
  ];
  if (delta && delta > 0) {
    body.push(`That’s a +${delta.toFixed(1)} jump from your previous checkpoint.`);
  }
  body.push('Lock in the habits that worked and queue your next mock while the streak is hot.');
  if (url) {
    body.push('', `Plan your next step: ${url}`);
  }
  body.push('', 'Onward,', 'Team GramorX');

  const whatsapp = url
    ? `🎯 Band ${band ?? ''}! Keep the streak — next practice: ${url}`.trim()
    : `🎯 Band up! Keep momentum and queue your next practice.`;

  return {
    locale,
    email: { subject, text: body.join('\n') },
    whatsapp: { text: whatsapp },
  };
}

function renderStreakBroken(
  event: LifecycleEventType,
  input: LifecycleTemplateInput,
  locale: 'en' | 'ur',
): LifecycleRenderedTemplate {
  const name = friendlyName(input.name);
  const ctx = input.context ?? {};
  const streak = extractNumber((ctx as Record<string, unknown>).streakDays ?? ctx.days ?? ctx.streak);
  const url = extractUrl(ctx as Record<string, unknown>);

  if (locale === 'ur') {
    const subject = 'ہم آپ کو دوبارہ ٹریک پر لانا چاہتے ہیں';
    const lines = [
      `سلام ${name}!`,
      '',
      streak
        ? `آپ کی ${streak}-دن کی اسٹریک رُک گئی ہے — کوئی بات نہیں۔`
        : 'ہم نے دیکھا ہے کہ آپ کی اسٹریک رُک گئی ہے — کوئی مسئلہ نہیں۔',
      'ایک ہلکا سا مشق منتخب کریں اور دوبارہ رفتار پکڑیں۔',
    ];
    if (url) {
      lines.push('', `یہاں سے دوبارہ شروع کریں: ${url}`);
    }
    lines.push('', 'ہم ساتھ ہیں،', 'GramorX ٹیم');

    const whatsapp = url
      ? `⏱️ ${name}, اسٹریک ہلکی سی رک گئی ہے۔ ابھی اس لنک سے مختصر مشق کریں: ${url}`
      : `⏱️ ${name}, اسٹریک رک گئی ہے۔ ایک چھوٹی مشق سے دوبارہ آغاز کریں۔`;

    return {
      locale,
      email: { subject, text: lines.join('\n') },
      whatsapp: { text: whatsapp },
    };
  }

  const subject = 'Let’s restart your study streak';
  const lines = [
    `Hi ${name},`,
    '',
    streak
      ? `Your ${streak}-day streak paused — totally okay.`
      : 'We noticed your study streak paused — totally okay.',
    'Grab a short practice to rebuild the rhythm. Even 10 focused minutes counts.',
  ];
  if (url) {
    lines.push('', `Jump back in: ${url}`);
  }
  lines.push('', 'We’ve got your back,', 'Team GramorX');

  const whatsapp = url
    ? `⏱️ Your streak paused, ${name}. Restart with a quick drill: ${url}`
    : `⏱️ Your streak paused, ${name}. A quick practice will restart the momentum.`;

  return {
    locale,
    email: { subject, text: lines.join('\n') },
    whatsapp: { text: whatsapp },
  };
}

const BUILDERS: Record<LifecycleEventType, TemplateBuilder> = {
  first_mock_done: renderFirstMock,
  band_up: renderBandUp,
  streak_broken: renderStreakBroken,
};

export function renderLifecycleTemplate(
  event: LifecycleEventType,
  input: LifecycleTemplateInput,
): LifecycleRenderedTemplate {
  const locale = pickLocale(input.locale);
  const builder = BUILDERS[event];
  return builder(event, input, locale);
}
