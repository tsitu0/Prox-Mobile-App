# Prox Mobile App

Mobile app built with Expo (React Native) and Supabase.

## Tech Stack
- Expo + Expo Router
- TypeScript
- Supabase (Auth + Database)

## Project Structure
mobile/
- app/            (Expo Router screens)
- src/lib/
  - supabase.ts   (Supabase client)
- .env            (environment variables, create this file locally; gitignored)

## Setup

### Prerequisites
- Node.js (LTS)
- Git
- Xcode (for iOS Simulator)

### Install
git clone <repo-url>
cd <repo-root>/mobile
npm install

### Supabase
1. Create a project at https://supabase.com
2. Enable Email / Password authentication
3. Copy your Project URL and Anon (publishable) key

Create a `.env` file in `mobile/`:
EXPO_PUBLIC_SUPABASE_URL=https://<project-id>.supabase.co  
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxxxx

### Run
npx expo start  
Press `i` to open the iOS simulator.

## Status
- Expo Router running
- Supabase connected and verified
- Ready for authentication and database features
