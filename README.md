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
- Supabase auth flow working (sign up, log in, sign out)
- Session persistence enabled (stays logged in after reload)
- Ready for grocery list features

## Auth Flow (Current)
- Start at `/` which redirects to `/signup` if logged out
- `/signup` for new users (email + password)
- `/login` for returning users
- `/account` shows the signed-in email and allows sign out
- Continue as Guest (local session) available on the landing page

## Groceries (Current)
- `/groceries` screen with manual entry form and list view
- Logged-in users store items in Supabase (`grocery_items`)
- Guest users store items locally on device

## Prices (Current)
- `/prices` screen loads grocery items and product price data
- Calculates best store set for a chosen number of retailers
- Only shows best plan results (raw price records are hidden)
- Requires `product_prices` to be seeded with sample data in Supabase

## UI (Current)
- Landing screen uses Prox colors, serif headline, and gradient background
- Sign Up / Log In / Continue as Guest actions are placed at the bottom
