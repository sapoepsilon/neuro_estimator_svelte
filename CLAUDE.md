# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development

```bash
npm run dev          # Start development server (http://localhost:5173)
npm run build        # Build for production
npm run preview      # Preview production build locally
```

### Testing

```bash
npm test             #don't run playwright tests yourslef. Ask me to run them, just give the commands then you could just connect  to the url and see the result
npm run test:ui      # Run tests with interactive UI. don't run playwright tests yourslef. Ask me to run them, just give the commands then you could just connect
  to the url and see the result
npm run test:debug   # Debug tests step by step. don't run playwright tests yourslef. Ask me to run them, just give the commands then you could just connect
  to the url and see the result
```

## Feature Implementations

When implemetning a feature, always check if the feature has been correctly implemented by running playwright mcp tool test. Then if everything is correct, create a playwright test for the feature. Then run all tests to see if nothing has been broken. npm test does not automatically quit after running tests, so you need to manually quit it once you get the url from the playwright e2e tests result.

If everything is correct, ask the user if they want to git commit and push the changes. If they say yes, use commitlint to commit the changes.
Do not add comments to the code, just implement the feature, unless asked to do so.
When creating components always add meaningful data-testid attributes to the components.
If editing existing components, always check if the changes break any existing tests.

## Architecture Overview

This is a Svelte 5 single-page application (not SvelteKit) for AI-powered construction project estimation.

### Technology Stack

- **Frontend**: Svelte 5 with Vite
- **Styling**: Tailwind CSS + custom component library (shadcn/ui pattern)
- **Routing**: svelte-spa-router (hash-based routing)
- **Auth**: Supabase Auth with JWT tokens
- **State**: Svelte stores
- **API**: Streaming NDJSON for real-time AI responses

### Key Directories

- `src/components/` - Page-level components (estimator/, auth/)
- `src/lib/components/ui/` - Reusable UI components library
- `src/lib/components/ai-agent/` - AI assistant components
- `src/stores/` - Svelte stores for state management
- `src/lib/services/` - API and streaming services

### Core Features

1. **EstimatorForm** - Main form for project description input
2. **StreamingEstimateView** - Real-time AI estimate display
3. **AI Sidebar** - Interactive AI assistant with MCP integration
4. **Authentication** - Email-based auth with Supabase

### API Integration Pattern

- Backend URL from `VITE_BACKEND_URL` environment variable
- Bearer token authentication using Supabase JWT
- Streaming responses use NDJSON format with EventSource-like API
- Vite proxy configuration for development: `/api` → backend

### Authentication Flow

- Supabase client in `src/lib/supabase.js`
- Auth state in `src/stores/authStore.js`
- Auto-refresh tokens with session management
- Email verification with magic links

### Testing Approach

- E2E tests with Playwright in `e2e/` directory
- Tests cover user flows, accessibility, responsive design
- Global setup for test environment initialization

### Environment Variables

```
VITE_BACKEND_URL       # Backend API URL
VITE_SUPABASE_URL      # Supabase project URL
VITE_SUPABASE_ANON_KEY # Supabase anonymous key
```

### Component Patterns

- Follow shadcn/ui composition pattern for UI components
- Components use `.svelte` extension
- Props passed with TypeScript-style annotations
- Event forwarding with `on:` directives
- Slot-based composition for complex components

### Deployment

- Static site deployment on Netlify
- SPA routing handled with `_redirects` rules
- Build output in `dist/` directory

Don't run `npm run dev` the chances are the app is already running are pretty high.
