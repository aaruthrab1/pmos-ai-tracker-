/** Static articles for demo when Supabase education_articles is empty. */
import { KNOWLEDGE_TOPICS } from '@/lib/care/knowledgeLibrary';

export interface DemoArticle {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: string;
  read_time_minutes: number;
  is_featured: boolean;
  content: string;
}

export const DEMO_ARTICLES: DemoArticle[] = [
  {
    id: 'demo-pcos',
    slug: 'understanding-pcos',
    title: 'Understanding PCOS',
    summary: 'What polycystic ovary syndrome means for your cycle, skin, and long-term health.',
    category: 'conditions',
    read_time_minutes: 5,
    is_featured: true,
    content: `# Understanding PCOS

PCOS is a hormonal condition that can affect menstrual cycles, fertility, weight, and skin health.

## Common signs
- Irregular or missed periods
- Excess hair growth or acne
- Difficulty managing weight
- Insulin resistance in some people

## What helps
- Tracking symptoms and cycle length over 2–3 months
- Balanced meals with protein and fiber
- Regular movement you enjoy
- Discussing concerns with a healthcare professional

## When to see a doctor
If cycles are very irregular, you have severe symptoms, or you're planning pregnancy, a clinician can guide next steps and tests.`,
  },
  {
    id: 'demo-pmos',
    slug: 'understanding-pmos',
    title: 'What is PMOS?',
    summary: 'Premenstrual syndrome amplified — patterns, not a character flaw.',
    category: 'conditions',
    read_time_minutes: 4,
    is_featured: false,
    content: `# What is PMOS?

PMOS describes severe premenstrual symptoms that affect daily life — mood, sleep, energy, and physical comfort.

## What you might notice
- Strong mood shifts in the week before your period
- Sleep disruption or fatigue
- Bloating, headaches, or skin flare-ups
- Feeling unlike yourself for several days each cycle

## Why tracking helps
Patterns over 2–3 cycles give clinicians clear evidence. Dates and severity matter more than a single bad day.

## Support strategies
- Gentle movement and consistent sleep times
- Protein-forward meals to stabilize energy
- Note triggers (stress, late nights, skipped meals)
- Discuss persistent symptoms with a healthcare provider`,
  },
  {
    id: 'demo-cycle',
    slug: 'cycle-tracking-basics',
    title: 'How to Track Your Cycle',
    summary: 'Simple daily logging that reveals patterns in mood, energy, and symptoms.',
    category: 'cycle',
    read_time_minutes: 4,
    is_featured: false,
    content: `# How to Track Your Cycle

Tracking your cycle helps identify patterns, predict periods, and understand hormonal changes.

## What to log
- Period start and end dates
- Mood and energy levels
- Sleep quality
- Symptoms like cramps or headaches

## Why it matters
Patterns help you prepare for challenging days and give your doctor clearer information.

## Getting started
Log for one full cycle — even rough notes help. Cyra's tracker makes daily check-ins quick.`,
  },
  {
    id: 'demo-doctor',
    slug: 'doctor-visit-prep',
    title: 'Preparing for a Doctor Visit',
    summary: 'Questions to ask and logs to bring for a productive appointment.',
    category: 'care',
    read_time_minutes: 6,
    is_featured: false,
    content: `# Preparing for a Doctor Visit

Walking in prepared helps you get the most from your appointment.

## Bring your logs
- Cycle dates for the last 3 months
- Symptom patterns you've noticed
- Medications and supplements

## Questions to consider
- Could my symptoms relate to hormones or PCOS?
- What tests would be helpful right now?
- What lifestyle changes do you recommend?

Cyra can generate a doctor visit summary from your tracked data.`,
  },
  {
    id: 'demo-cycle-basics',
    slug: 'cycle-basics',
    title: 'Cycle Basics',
    summary: 'Phases, length, and what "normal" really means for you.',
    category: 'cycle',
    read_time_minutes: 5,
    is_featured: false,
    content: `# Cycle Basics

## How a cycle works
- A cycle runs from day 1 of bleeding to the day before the next period
- Typical length is 21–35 days; longer cycles are common with PCOS
- Phase-aware logging reveals when symptoms cluster

## The four phases
- Menstrual: bleeding days
- Follicular: energy often rises after bleeding ends
- Ovulation: mid-cycle; some people feel a brief energy peak
- Luteal: premenstrual symptoms may appear before the next period

## Your personal baseline
"Normal" is what is typical for you over several months — not a textbook 28 days.`,
  },
  {
    id: 'demo-hormones',
    slug: 'hormones',
    title: 'Hormones Explained',
    summary: 'Estrogen, progesterone, and androgens in plain language.',
    category: 'conditions',
    read_time_minutes: 6,
    is_featured: false,
    content: `# Hormones Explained

## Key hormones
- Estrogen rises in the follicular phase and supports energy and mood for many people
- Progesterone dominates after ovulation and can affect sleep and appetite
- Androgens influence skin, hair, and scalp — especially in PCOS

## Why labs are timed
Doctors often order blood tests on specific cycle days so results are comparable month to month.

## What you can do
Track symptoms alongside cycle phase — it helps connect how you feel to hormonal shifts.`,
  },
  {
    id: 'demo-lifestyle',
    slug: 'lifestyle',
    title: 'Lifestyle Support',
    summary: 'Sleep, movement, and nutrition that support hormone balance.',
    category: 'care',
    read_time_minutes: 5,
    is_featured: false,
    content: `# Lifestyle Support

## Sleep
Consistent sleep times stabilize mood and energy across cycle phases.

## Nutrition
Protein-forward meals may reduce sugar cravings and afternoon crashes.

## Movement
Gentle movement beats intense bursts when energy is low — walking, yoga, and stretching all count.

## Stress
Short breathing breaks and predictable routines help when hormones feel overwhelming.`,
  },
  {
    id: 'demo-fertility',
    slug: 'fertility-myths',
    title: 'Fertility Myths',
    summary: 'Separate fact from fear about cycles, PCOS, and conception.',
    category: 'care',
    read_time_minutes: 4,
    is_featured: false,
    content: `# Fertility Myths

## Myth: Irregular cycles mean you cannot conceive
Many people with irregular cycles conceive — timing and support matter.

## Myth: PCOS makes pregnancy impossible
PCOS management often improves ovulation over time with lifestyle and medical support.

## Fact: Tracking helps
Knowing when you ovulate (or if ovulation is inconsistent) guides next steps with a clinician.`,
  },
];

const SLUG_ALIASES: Record<string, string> = {
  'understanding-pcos': 'understanding-pcos',
  pmos: 'understanding-pmos',
};

function articleFromTopic(topicId: string): DemoArticle | undefined {
  const topic = KNOWLEDGE_TOPICS.find((t) => t.id === topicId);
  if (!topic) return undefined;
  const bullets = topic.bullets.map((b) => `- ${b}`).join('\n');
  return {
    id: `topic-${topic.id}`,
    slug: topic.articleSlug ?? topic.id,
    title: topic.title,
    summary: topic.teaser,
    category: 'care',
    read_time_minutes: topic.readMinutes,
    is_featured: false,
    content: `# ${topic.title}\n\n${topic.teaser}\n\n## Key points\n${bullets}`,
  };
}

export function getDemoArticleBySlug(slug: string): DemoArticle | undefined {
  const normalized = SLUG_ALIASES[slug] ?? slug;
  const direct = DEMO_ARTICLES.find((a) => a.slug === normalized);
  if (direct) return direct;

  const byTopicSlug = KNOWLEDGE_TOPICS.find((t) => t.articleSlug === slug);
  if (byTopicSlug) return articleFromTopic(byTopicSlug.id);

  const byTopicId = articleFromTopic(slug);
  if (byTopicId) return byTopicId;

  return undefined;
}

/** Always returns educational content — never null. */
export function resolveDemoArticle(slug: string): DemoArticle {
  const found = getDemoArticleBySlug(slug);
  if (found) return found;

  const title = slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return {
    id: 'fallback-article',
    slug,
    title,
    summary: 'Educational overview to support your health journey.',
    category: 'care',
    read_time_minutes: 4,
    is_featured: false,
    content: `# ${title}

This article is part of Cyra's education library. While we prepare the full version, here are practical starting points:

## Why this matters
Understanding your body helps you advocate for yourself in medical settings and spot patterns early.

## What to track
- Cycle dates and symptom severity
- Sleep, mood, and energy over a full cycle
- Questions that come up before your next appointment

## Next steps
Browse other articles in Care or ask Sakhi for personalized guidance.`,
  };
}

export function getFeaturedDemoArticle(): DemoArticle {
  return DEMO_ARTICLES.find((a) => a.is_featured) ?? DEMO_ARTICLES[0];
}
