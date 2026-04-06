# Medical Assistant

A simple medical office voice assistant demo.

## What it does

- Accepts speech or text input in the browser
- Uses Gemini 2.0 when an API key is present
- Falls back to a local parser if no API key is set
- Supports these three intents so far:
  - book an appointment
  - reschedule an appointment
  - fallback for anything else
- Asks for missing name, date, or time
- Handles small corrections
- Logs a multi-turn conversation between the chatbot and user
- Simulates the final action (no real backend), and logs the result

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

1. Clone the repo


2. Install dependencies
   npm install

3. Add your API key
   cp .env.example .env
   # then open .env and paste your Gemini API key

4. Run the server
   node server.js

5. Open http://localhost:3000

## Notes

- Browser speech recognition support and performance will vary by browser.
- The text box works as fallback to the speech recognition.

## Good demo prompts

- I want to book an appointment for Maria Gomez next Monday at 3 pm
- Please reschedule my appointment. My name is Jonah Smith and I need Friday morning
- Actually, next Tuesday instead
- What can you help me with?