/** Client-side wellness fallbacks when the API is unreachable or returns an error. */
export function getSakhiFallbackResponse(message: string): string {
  const text = message.trim().toLowerCase();

  if (/pcos|polycystic/.test(text)) {
    return 'PCOS is a hormonal condition that can affect menstrual cycles, fertility, weight, and skin health. Tracking symptoms and consulting a healthcare professional can help manage it.';
  }
  if (/track.*cycle|cycle.*track|how.*track|tracking/.test(text)) {
    return 'Tracking your cycle helps identify patterns, predict periods, and understand hormonal changes. Log your period start date, symptoms, mood, and sleep regularly — even a few months of data can reveal useful patterns.';
  }
  if (/late|delayed|missed|not come|why.*period/.test(text)) {
    return 'A delayed period can happen due to stress, illness, lifestyle changes, hormonal imbalance, or pregnancy. If delays continue for several cycles, consult a healthcare professional.';
  }
  if (/food|diet|eat|nutrition/.test(text)) {
    return 'During periods, iron-rich foods (leafy greens, lentils), hydration, warm meals, and balanced protein can support energy. Listen to your body — gentle nourishment often feels best.';
  }
  if (/cramp|pain|ache|period pain/.test(text)) {
    return 'Hydration, light exercise, heat therapy, and adequate rest may help reduce menstrual cramps. If pain is severe or sudden, please consult a healthcare professional.';
  }
  if (/irregular|unpredictable/.test(text)) {
    return 'Irregular periods can stem from stress, PCOS, thyroid issues, weight changes, or hormonal shifts. Tracking for 2–3 months helps your doctor see patterns — consider a check-up if this is new for you.';
  }
  if (/hormon|hormonal|balance/.test(text)) {
    return 'Hormonal health is supported by regular sleep, balanced nutrition, stress management, and movement. Tracking cycles and symptoms gives you and your clinician clearer insight over time.';
  }
  if (/doctor|consult|clinic|when.*see|healthcare|gynaec|gynec/.test(text)) {
    return 'Consult a healthcare professional if you have severe pain, very heavy bleeding, cycles longer than 35 days or shorter than 21 days, missed periods for 3+ months, or symptoms that worry you.';
  }

  return 'I\'m AI Sakhi, your wellness companion for cycle tracking, menstrual health, and PCOS awareness. I\'m here to offer supportive guidance — for personal medical decisions, please consult a qualified healthcare professional.';
}

export const SAKHI_WELCOME_MESSAGE =
  'Hi! I\'m AI Sakhi 🌸\nI\'m here to help with cycle tracking, menstrual wellness, PCOS awareness, and general reproductive health guidance.';
