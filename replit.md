# OpenClaw - AI Social Media Automation Platform

## Project Overview
OpenClaw is an AI-powered social media automation system for Facebook and Instagram. It handles comment moderation, DM chatbot responses, and daily reporting via Telegram.

## Architecture
- **Replit Role**: Development environment ONLY — write code, commit, push to GitHub. NOT production.
- **Production**: GitHub → Railway auto-deploy
- **No long-running servers on Replit** after tasks are complete

## Workflow Rules
1. Analyze code before changes
2. Create backup branch before modifications (e.g., `backup-before-update-YYYYMMDD`)
3. Implement changes + basic logic testing
4. Clear commit messages
5. Push to GitHub via GitHub API
6. Stop all processes on Replit after completion

## Safety Principles
- Never delete old code without backup
- Never change system structure without analysis
- Never break existing functionality
- Before modifying any module: read code → check dependencies → ensure no breaking changes

## Tech Stack
- **API Server**: Express.js + TypeScript (artifacts/api-server)
- **Dashboard**: React + Vite + Tailwind CSS (artifacts/dashboard)
- **Database**: PostgreSQL (Drizzle ORM)
- **Queue**: BullMQ + Redis
- **AI**: OpenAI GPT-4o
- **Alerts**: Telegram Bot
- **Integrations**: Facebook Graph API v19.0, Instagram API

## Project Structure
```
artifacts/
  api-server/         - Express API backend
    src/
      config/         - env, constants, prompt-manager
      core/           - logger, task-runner, event-bus, agent-manager
      db/             - migrations
      integrations/   - facebook/, instagram/, openai/, telegram/
      memory/         - redis cache, conversation memory
      routes/         - API endpoints
      workflows/      - comment-moderation, dm-chatbot, daily-report
      tools/          - rate-limiter
  dashboard/          - React frontend
    src/
      pages/          - overview, products, prompts, scenarios, pages-config, reports, logs
      components/     - layout, ui/ (shadcn-based)
      hooks/          - React Query hooks for API
      lib/            - api utility, cn utility
lib/
  db/                 - Drizzle DB connection + schema
  api-client-react/   - Generated API client
  api-spec/           - OpenAPI spec
  api-zod/            - Zod validators
```

## Key Environment Variables
- DATABASE_URL, REDIS_URL
- OPENAI_API_KEY, OPENAI_MODEL
- FACEBOOK_APP_ID, FACEBOOK_APP_SECRET, FACEBOOK_VERIFY_TOKEN
- TELEGRAM_BOT_TOKEN, TELEGRAM_ALERT_CHAT_ID

## Facebook OAuth Integration
- **OAuth Flow**: Settings page → `/api/auth/facebook/init` (generate state) → Facebook OAuth dialog → `/api/auth/facebook/callback` (exchange code → long-lived token → fetch pages → upsert DB) → redirect to dashboard
- **Security**: CSRF protection via random state token stored in Redis (10min TTL), validated and consumed on callback
- **Endpoints**: 
  - `GET /api/auth/facebook/config` — returns whether FB App is configured + App ID
  - `GET /api/auth/facebook/init` — generates OAuth state token
  - `GET /api/auth/facebook/callback` — handles OAuth code exchange, saves pages
  - `POST /api/auth/facebook/disconnect/:pageId` — deactivates a page
- **Route file**: `artifacts/api-server/src/routes/auth.routes.ts`
- **Settings page**: `artifacts/dashboard/src/pages/settings.tsx`
- Tokens stored in `facebook_pages` table, cached in Redis (10 min TTL)
- Instagram Business accounts auto-detected via `instagram_business_account` field from Facebook Pages API
- **Required env vars**: `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, optionally `API_BASE_URL` for production redirect URI
