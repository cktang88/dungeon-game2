# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a text-based dungeon crawler game powered by Gemini 2.5 Flash and Cloudflare Workers. The architecture combines a React 19 frontend with a serverless Hono backend, using BAML for structured LLM outputs and comprehensive TypeScript types throughout.

## Development Commands

```bash
# Development
npm run dev                    # Start development server
npm install                    # Install dependencies
npx baml-cli generate         # Generate BAML TypeScript client (required after BAML schema changes)

# Build & Deploy
npm run build                 # TypeScript compilation + Vite build
npm run deploy               # Build and deploy to Cloudflare Workers
npm run check                # Full validation including dry-run deploy

# Code Quality
npm run lint                 # ESLint validation
tsc                          # TypeScript type checking
```

## Environment Setup

Required environment files:
- `.env` - Copy from `.env.example` and add Google API key
- `.dev.vars` - For local development: `GOOGLE_API_KEY=your_key_here`

Get Google API key from: https://makersuite.google.com/app/apikey

## Architecture Overview

### Frontend (React 19 + Vite)
- **Components**: Shadcn/UI components in `src/components/ui/`
- **Game Features**: Located in `src/react-app/features/game/`
- **Routing**: Wouter for lightweight client-side routing
- **State**: React hooks + TanStack Query for server state
- **Styling**: Tailwind CSS 4.1.6 with CSS variables

### Backend (Cloudflare Workers + Hono)
- **Entry Point**: `src/worker/index.ts`
- **Game Handlers**: `src/worker/game/handlers.ts` - Main API endpoints
- **Framework**: Hono 4.7.7 for serverless routing

### Game Engine
- **Core Logic**: `src/lib/game/gameEngine.ts` - Client-side game state management
- **API Client**: `src/lib/api/gameApi.ts` - Server communication
- **Types**: `src/types/game.ts` - Comprehensive TypeScript interfaces for game entities

### LLM Integration (Gemini API)
- **Direct API**: Uses Google Gemini 2.5 Flash via direct HTTP calls
- **Settings**: Temperature 0.8, max 8192 tokens, exponential backoff retry

## Key Files & Their Purposes

- `src/types/game.ts` - Core game state types (GameState, Player, Room, Item, Monster)
- `src/lib/game/gameEngine.ts` - Game engine class with state management and action processing
- `src/worker/game/handlers.ts` - API handlers for game actions using Gemini API
- `src/lib/api/gameApi.ts` - Frontend API client with error handling

## TypeScript Configuration

Multi-config setup:
- `tsconfig.json` - Root configuration
- `src/react-app/tsconfig.json` - Frontend app (ES2020 target)
- `src/worker/tsconfig.json` - Cloudflare Worker (ES2022 target)
- Path alias: `@/*` maps to `./src/*`

## Game Action System

The game uses a unified action system where:
1. Player types natural language commands
2. Actions are processed by the client-side game engine
3. Complex actions are sent to the LLM via API for interpretation
4. Responses follow structured BAML schemas for consistency
5. Game state is updated and UI re-renders

## Development Notes

- **No Test Framework**: Currently no tests configured - opportunity for improvement
- **Strict TypeScript**: All configs use strict mode with comprehensive linting
- **Environment**: Uses Cloudflare environment variables for API keys
- **Deployment**: Single command deployment to Cloudflare Workers via Wrangler

## Common Patterns

- React functional components with hooks
- TypeScript interfaces for all game entities
- Error handling with exponential backoff
- Structured LLM responses via BAML schemas
- Client-side game state with server-side AI processing