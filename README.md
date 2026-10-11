# Medical Assistant

This is a simple voice assistant demo intended for a medical office! No backend

## What it does

- Accepts speech or text input in the browser
- Uses Gemini 2.0 as an LLM when an API key is present, and falls back to a parser if there is no API key se
- So far, supports these three intents:
  - book an appointment
  - reschedule an appointment
  - fallback for anything else
- Asks for missing name, date, or time, and handles small corrections
- Logs a multi-turn conversation between the chatbot and user

## Technical approach

The chatbot assistant is built around a fill-in-the-blanks conversation model. Each message from the user is parsed to extract three pieces of information: name, date, and time. These are stored in a server session. The assistant will continue to ask follow up questions until all three slots are filled, and then confirms the booking.
Parsing is handled in two layers. When a Gemini API key is activated, Gemini 2.0 Flash recieves the user's message along with a prompt, and returns JSON that contains the intent, extracted info,  missing fields, and if the message is a correction. If Gemini is unavailable, an internal parser detects intent and parses the message manually with no external API call.
The server handles session states across turns, so the assistant remembers names/other info provided in one message when asking for other information in the next. A session will reset automatically when a booking or rescheduling is finalized.
The frontend communicates with the server via a single POST endpoint (/api/interpret) and leaves all reply generation to the server. It displays whatever the server returns. Speech input uses the browser's Web Speech API, and has the text input box as a fallback.

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
   then open .env and paste your Gemini API key

4. Run the server
   node server.js

5. Open http://localhost:3000

## Good demo prompts

- I want to book an appointment for Maria Gomez next Monday at 3 pm
- Please reschedule my appointment. My name is Jonah Smith and I need Friday morning
- Actually, next Tuesday instead
- What can you help me with?
