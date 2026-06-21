import type { SakhiLanguage } from '../config/sakhi.prompt.js';

interface FallbackRule {
  pattern: RegExp;
  response: string;
}

const ENGLISH_RULES: FallbackRule[] = [
  {
    pattern: /pcos|polycystic/i,
    response:
      'PCOS is a hormonal condition that can affect menstrual cycles, fertility, weight, and skin health. Tracking symptoms and consulting a healthcare professional can help manage it.',
  },
  {
    pattern: /track.*cycle|cycle.*track|how.*track|tracking.*period/i,
    response:
      'Tracking your cycle helps identify patterns, predict periods, and understand hormonal changes. Log your period start date, symptoms, mood, and sleep regularly — even a few months of data can reveal useful patterns.',
  },
  {
    pattern: /late|delayed|missed|period.*not.*come|why.*period/i,
    response:
      'A delayed period can happen due to stress, illness, lifestyle changes, hormonal imbalance, or pregnancy. If delays continue for several cycles, consult a healthcare professional.',
  },
  {
    pattern: /food|diet|eat|nutrition|period.*meal/i,
    response:
      'During periods, iron-rich foods (leafy greens, lentils), hydration, warm meals, and balanced protein can support energy. Listen to your body — gentle nourishment often feels best.',
  },
  {
    pattern: /cramp|pain|ache|period pain|dysmenorrhea/i,
    response:
      'Hydration, light exercise, heat therapy, and adequate rest may help reduce menstrual cramps. If pain is severe or sudden, please consult a healthcare professional.',
  },
  {
    pattern: /irregular|unpredictable|cycle.*off|period.*irregular/i,
    response:
      'Irregular periods can stem from stress, PCOS, thyroid issues, weight changes, or hormonal shifts. Tracking for 2–3 months helps your doctor see patterns — consider a check-up if this is new for you.',
  },
  {
    pattern: /hormon|hormonal|balance|endocrine/i,
    response:
      'Hormonal health is supported by regular sleep, balanced nutrition, stress management, and movement. Tracking cycles and symptoms gives you and your clinician clearer insight over time.',
  },
  {
    pattern: /doctor|consult|clinic|when.*see|healthcare|gynaec|gynec/i,
    response:
      'Consult a healthcare professional if you have severe pain, very heavy bleeding, cycles longer than 35 days or shorter than 21 days, missed periods for 3+ months, or symptoms that worry you.',
  },
  {
    pattern: /pregn|conceive|fertile|ovul/i,
    response:
      'Fertility awareness starts with understanding your cycle. Track period dates and ovulation signs. For personalised advice about conception or contraception, speak with a qualified clinician.',
  },
  {
    pattern: /mood|anxiet|stress|mental|depress/i,
    response:
      'Mood changes across your cycle are common due to hormonal shifts. Tracking mood alongside your cycle can help you anticipate difficult days. If low mood persists, please reach out to a mental health professional.',
  },
  {
    pattern: /sleep|tired|fatigue|energy/i,
    response:
      'Sleep and energy often fluctuate with your cycle. Prioritise consistent bedtime, hydration, and gentle movement. If fatigue is constant, mention it at your next health visit.',
  },
];

const DEFAULT_ENGLISH =
  'I\'m AI Sakhi, your wellness companion for cycle tracking, menstrual health, and PCOS awareness. I\'m here to offer supportive guidance — for personal medical decisions, please consult a qualified healthcare professional.';

export function getTopicFallback(message: string, _language: SakhiLanguage = 'English'): string {
  const text = message.trim();
  for (const rule of ENGLISH_RULES) {
    if (rule.pattern.test(text)) return rule.response;
  }
  return DEFAULT_ENGLISH;
}
