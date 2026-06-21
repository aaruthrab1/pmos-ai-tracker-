import type { CyraDoctorReport } from '@/lib/reports';

function dateRangeFromPreset(days: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

function formatReportTitle(start: string, end: string) {
  const fmt = (d: string) =>
    new Intl.DateTimeFormat('en-IN', { month: 'short', day: 'numeric' }).format(new Date(d));
  return `Doctor Report — ${fmt(start)} to ${fmt(end)}`;
}

/** Client-side sample report when API/DB is unavailable in demo. */
export function createDemoDoctorReport(days = 90): CyraDoctorReport {
  const { start, end } = dateRangeFromPreset(days);
  const now = new Date().toISOString();

  return {
    id: `demo-report-${Date.now()}`,
    title: formatReportTitle(start, end),
    date_range_start: start,
    date_range_end: end,
    summary:
      'This sample report summarizes typical cycle-tracking patterns. Log more days in Cyra to personalize insights for your next visit.',
    key_symptoms: ['Irregular cycle length', 'Mild premenstrual mood changes', 'Occasional fatigue'],
    questions_for_doctor: [
      'Could my cycle patterns suggest PCOS or another hormonal condition?',
      'What blood tests would be helpful at my age and symptom profile?',
      'What lifestyle changes do you recommend before medication?',
    ],
    sections: {
      cyclePatternSummary: [
        'Cycles logged over the selected period show some variation in length.',
        'Tracking for 2–3 more cycles will clarify your personal baseline.',
      ],
      symptomTrends: [
        'Mood and energy shifts may cluster in the week before bleeding.',
        'Sleep quality appears linked to energy on several logged days.',
      ],
      sleepEnergyTrends: ['Average sleep logged around 6–7 hours on tracked nights.'],
      moodTrends: ['Mood scores show mild dips in the late luteal phase.'],
      weightTrends: ['Not enough weight entries yet for a reliable trend line.'],
      discussionPoints: [
        'Share your symptom timeline and any family history of PCOS or thyroid issues.',
        'Ask about timed labs if cycles remain irregular.',
      ],
      suggestedTests: [
        { name: 'Fasting glucose / HbA1c', reason: 'Screen for insulin resistance when cycles are irregular' },
        { name: 'Thyroid panel (TSH)', reason: 'Rule out thyroid contribution to cycle changes' },
      ],
    },
    doctor_prep: {
      questionsToAsk: [
        'What could explain my irregular cycles?',
        'When should I consider fertility planning tests?',
      ],
      symptomTimeline: [
        { date: end, summary: 'Sample entry — replace with your logged symptoms in Cyra.' },
      ],
      keyConcerns: ['Cycle regularity', 'Energy and mood patterns'],
      testChecklist: [
        { name: 'Cycle day 3 hormones', reason: 'Baseline if cycles are irregular', suggested: true },
      ],
      appointmentNotes: 'Bring printed logs or share this report from Cyra before your visit.',
    },
    source_snapshot: {
      patient: { name: 'Demo user', conditions: [], healthGoals: ['Track cycles'] },
      periodLogs: [],
      moodLogs: [],
      sleepLogs: [],
      weightLogs: [],
      metabolicLogs: [],
      androgenLogs: [],
      quizResults: [],
      chartData: { sleepHours: [], moodEnergy: [], weight: [] },
      dataCoverage: {
        periods: 0,
        moods: 0,
        sleep: 0,
        weight: 0,
        metabolic: 0,
        androgen: 0,
        quizzes: 0,
      },
    },
    risk_summary: [
      {
        concern: 'Limited tracking data',
        severity: 'low',
        note: 'Log daily for a few weeks to strengthen this report.',
      },
    ],
    status: 'ready',
    created_at: now,
  };
}
