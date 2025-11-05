# Adoras - Parent-Child Memory Sharing App

A sophisticated memory-sharing platform connecting families through stories, photos, and voice notes.

## Features

- 🎯 Dual user flows (Legacy Keepers & Storytellers)
- 💬 AI-powered chat and memory categorization  
- 📸 Media library with intelligent organization
- 🌍 Multi-language support (6 languages)
- 📱 Full PWA functionality with offline support
- 🔐 Secure Supabase backend integration

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS v4
- **Backend:** Supabase (Auth, Database, Storage, Edge Functions)
- **AI:** OpenAI (vision) + Groq (transcription & text)
- **UI Components:** Radix UI + shadcn/ui

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment

This app is configured for Vercel deployment with:
- Automatic builds from the `main` branch
- Environment variables for API keys
- PWA service worker support
- SPA routing configuration

### Required Environment Variables

Set these in your Vercel project settings:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `GROQ_API_KEY`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`

## License

Proprietary - All rights reserved
