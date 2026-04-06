const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const MODEL = 'gemini-2.0-flash';

app.use(express.json({ limit: '1mb' }));
app.use(express.static('public'));

// Controls session memory
let session = {
  intent: null,
  slots: {
    patient_name: null,
    date: null,
    time: null
  }
};

function normalizeText(text = '') {
  return String(text)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9,.'\-\s]/g, '')
    .trim();
}

function localParse(message = '') {
  const original = String(message || '');
  const text = normalizeText(original);
  const slots = { patient_name: null, date: null, time: null };
  let isCorrection = /\b(actually|instead|change|correction|no,?\s+|rather)\b/i.test(original);
  let intent = 'fallback';

  const rescheduleKeywords = ['reschedule', 'move', 'change', 'switch', 'push', 'new time', 'new day'];
  const bookingKeywords = ['book', 'schedule', 'make', 'set up', 'appointment', 'visit', 'checkup', 'need', 'want', 'like to'];

  if (rescheduleKeywords.some((k) => text.includes(k))) {
    intent = 'reschedule_appointment';
  }
  else if (bookingKeywords.some((k) => text.includes(k))) {
    intent = 'book_appointment';
  }

  if (intent === 'fallback') {
    if (text.includes('appointment')) {
      intent = 'book_appointment';
    }
  }

  const nameMatch = original.match(/(?:my name is|i am|this is)\s+([A-Za-z]+(?:\s+[A-Za-z]+){0,2})/i);
  if (nameMatch) slots.patient_name = nameMatch[1].replace(/\b\w/g, (c) => c.toUpperCase());

const dateMatch = original.match(/(?:next\s+)?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow|(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:st|nd|rd|th)?|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/i);
  if (dateMatch) slots.date = dateMatch[0];

  const timeMatch = original.match(/\b(?:\d{1,2}(?::\d{2})?\s?(?:am|pm)?)\b/i);
  if (timeMatch) slots.time = timeMatch[0].replace(/\s+/g, ' ');

  const missing_fields = [];
  if (intent !== 'fallback') {
    if (!slots.patient_name) missing_fields.push('patient_name');
    if (!slots.date) missing_fields.push('date');
    if (!slots.time) missing_fields.push('time');
  }

  return {
    intent,
    slots,
    missing_fields,
    is_correction: isCorrection
  };
}


async function geminiParse(message) {
  if (!GEMINI_API_KEY) return localParse(message);

  const prompt = `You are a strict medical office phone assistant.

Your ONLY job is to extract structured data for appointment handling.

You MUST NOT:
- Answer general knowledge questions
- Give medical advice
- Go outside booking or rescheduling

Supported intents ONLY:
1. book_appointment
2. reschedule_appointment
3. fallback

You must always return JSON in this exact format:
{
  "intent": "book_appointment | reschedule_appointment | fallback",
  "slots": {
    "patient_name": string | null,
    "date": string | null,
    "time": string | null
  },
  "missing_fields": string[],
  "is_correction": boolean
}

Rules:
1. Intent Detection
- Booking -> "book_appointment"
- Changing an existing schedule, appointment, or plan -> "reschedule_appointment"
- Only if the intent is really not clear -> "fallback"
- Assume "book_appointment" if the user expresses any desire to see a doctor, make a visit, book something, or use words like "need", "want", "like to" with the word "appointment"

2. Slot Filling
- Extract patient name, date, time
- If missing -> add to "missing_fields"

3. Corrections
- If user says "actually", "change", "instead"
  -> set "is_correction": true
  -> update ONLY the changed field

4. DO NOT GUESS
- If info is unclear -> leave as null

5. Keep responses deterministic and minimal

User input:
${message}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 300,
          responseMimeType: 'application/json'
        }
      })
    }
  );

  if (!response.ok) {
    const err = await response.text().catch(() => '');
    console.warn(`Gemini unavailable (${response.status}) — using local parser`);
    return localParse(message);
  }

  const data = await response.json();
  let text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '{}';

  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    text = match[0];
  }

  try {
    const parsed = JSON.parse(text);
    const slots = parsed.slots || {};
    const result = {
      intent: ['book_appointment', 'reschedule_appointment', 'fallback'].includes(parsed.intent)
        ? parsed.intent
        : 'fallback',
      slots: {
        patient_name: slots.patient_name ?? null,
        date: slots.date ?? null,
        time: slots.time ?? null
      },
      missing_fields: Array.isArray(parsed.missing_fields) ? parsed.missing_fields : [],
      is_correction: Boolean(parsed.is_correction)
    };

    if (result.intent !== 'fallback' && result.missing_fields.length === 0) {
      if (!result.slots.patient_name) result.missing_fields.push('patient_name');
      if (!result.slots.date) result.missing_fields.push('date');
      if (!result.slots.time) result.missing_fields.push('time');
    }

    return result;
  } catch {
    return localParse(message);
  }
}

// Updates the session
function updateSession(session, result) {
  if (result.intent !== 'fallback') {
    session.intent = result.intent;
  }

  for (let key of ['patient_name', 'date', 'time']) {
    if (result.slots[key]) {
      session.slots[key] = result.slots[key];
    }
  }

  return session;
}

// Generates response
function generateResponse(session, result) {
  if (!session.intent) {
    if (result.intent !== 'fallback') {
      session.intent = result.intent;
    } else {
      return "I can help you book or reschedule an appointment. What would you like to do?";
    }
  }

  if (!session.slots.patient_name) {
    return "Can I get your name?";
  }
  if (!session.slots.date) {
    return "What day would you like to come in?";
  }
  if (!session.slots.time) {
    return "What time works for you?";
  }

  return null;
}

// Final action of the chatbot
function finalize(session) {
  if (session.intent === 'book_appointment') {
    return `✅ Appointment booked for ${session.slots.patient_name} on ${session.slots.date} at ${session.slots.time}.`;
  }

  if (session.intent === 'reschedule_appointment') {
    return `🔄 Appointment rescheduled to ${session.slots.date} at ${session.slots.time}.`;
  }

  return "Done.";
}

app.post('/api/interpret', async (req, res) => {
  console.log("SESSION ON ENTRY:", session);
  try {
    const message = String(req.body?.message || '').trim();
    if (!message) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    const result = await geminiParse(message);

    // Updates the session memory
    session = updateSession(session, result);

    // Log
    console.log("INPUT:", message);
    console.log("PARSED:", result);
    console.log("SESSION:", session);

    const followUp = generateResponse(session, result);

    if (followUp) {
      return res.json({
        reply: followUp,
        session,
        done: false,
        provider: GEMINI_API_KEY ? 'gemini' : 'local-fallback'
      });
    }

    const confirmation = finalize(session);
    console.log("FINAL RESULT:", session);

    // resets the session
    session = {
      intent: null,
      slots: { patient_name: null, date: null, time: null }
    };

    res.json({
      reply: confirmation,
      done: true,
      provider: GEMINI_API_KEY ? 'gemini' : 'local-fallback'
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to interpret message.', provider: 'error' });
  }
});

app.listen(PORT, () => {
  console.log(`SENA medical assistant running on http://localhost:${PORT}`);
});