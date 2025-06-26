# Dungeon Crawler LLM Game

A text-based dungeon crawler game powered by Gemini 2.5 Flash and Cloudflare Workers.

## Setup

1. Copy `.env.example` to `.env` and add your Google API key:
   ```
   cp .env.example .env
   ```

2. Get a Google API key from https://makersuite.google.com/app/apikey

3. For local development, create `.dev.vars` file:
   ```
   GOOGLE_API_KEY=your_google_api_key_here
   ```

4. Install dependencies:
   ```
   npm install
   ```

5. Generate BAML client:
   ```
   npx baml-cli generate
   ```

6. Run development server:
   ```
   npm run dev
   ```

## How to Play

- **Movement**: Type "go north", "move south", "walk east", etc.
- **Take items**: Type "take sword", "pick up potion", "grab key"
- **Use items**: Type "use potion", "eat bread", "drink elixir"
- **Combat**: Type "attack goblin", "fight skeleton", "strike enemy"
- **Examine**: Type "examine door", "look at inscription", "inspect item"
- **Talk**: Type "talk to merchant", "speak to guard"
- **Craft**: Type "craft rope from vines and cloth"
- **Custom actions**: Type anything else you want to try!

The game features:
- Dynamic room generation
- Item crafting system
- Combat with monsters
- Inventory management
- Humorous dungeon master responses
- Flexible action system

## Deployment

1. Update `wrangler.json` with your Google API key or use Cloudflare secrets
2. Run `npm run deploy`

## Tech Stack

- Cloudflare Workers (backend)
- Vite + React (frontend)
- BAML (structured LLM outputs)
- Gemini 2.5 Flash (AI dungeon master)
- Shadcn/UI + Tailwind CSS (UI components)