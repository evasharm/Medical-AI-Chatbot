# SENA Medical Assistant

A simple medical office voice assistant demo for the SENA AI Engineering Challenge.

## What it does

- Accepts speech or text input in the browser
- Uses Gemini 2.5 Flash-Lite when an API key is present
- Falls back to a local parser if no API key is set
- Supports only three intents:
  - book an appointment
  - reschedule an appointment
  - fallback for anything else
- Asks for missing name, date, or time
- Handles small corrections like “actually, next Monday”
- Simulates the final action and logs the result

## Project structure

```text
sena-medical-assistant/
├── public/
│   ├── app.js
│   ├── index.html
│   └── styles.css
├── server.js
├── package.json
├── .env.example
└── README.md
```

## Setup

1. Install Node.js 18 or newer.
2. Copy `.env.example` to `.env`.
3. Add your Gemini API key.
4. Install dependencies:

```bash
npm install
```

5. Start the app:

```bash
npm start
```

6. Open:

```text
http://localhost:3000
```

## Notes

- Browser speech recognition support varies by browser.
- The text box always works as fallback.
- The app does not connect to any real backend or medical system.

## Good demo prompts

- I want to book an appointment for Maria Gomez next Monday at 3 pm
- Please reschedule my appointment. My name is Daniel Lee and I need Friday morning
- Actually, next Tuesday instead
- What can you help me with?
