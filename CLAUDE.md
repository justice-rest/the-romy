# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Rōmy helps small nonprofits find new major donors at a fraction of the cost of existing solutions. Built with Next.js 15, it's an open-source platform supporting OpenAI, Anthropic (Claude), Google (Gemini), Mistral, Perplexity, XAI (Grok), OpenRouter, and local Ollama models. It features BYOK (Bring Your Own Key) support, file uploads, and works with or without Supabase (hybrid local/cloud architecture).

## Common Development Commands

```bash
# Development
npm run dev              # Start dev server with Turbopack
npm run build            # Build production bundle
npm run start            # Start production server
npm run lint             # Run ESLint
npm run type-check       # TypeScript type checking without emit

# Environment Setup
cp .env.example .env.local    # Copy environment template
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"  # Generate CSRF_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"  # Generate ENCRYPTION_KEY

# Docker
docker-compose -f docker-compose.ollama.yml up    # Run with Ollama locally
docker build -t romy .                            # Build production image
```

## Architecture Overview

### Directory Structure
- `/app` - Next.js 15 app router (pages, API routes, auth flows)
- `/app/api` - Backend API endpoints for chat streaming, models, preferences, etc.
- `/lib` - Core business logic (27+ subdirectories)
  - `/chat-store` - Chat and message state management (Context + IndexedDB + Supabase)
  - `/model-store`, `/user-store`, `/user-preference-store` - State providers
  - `/models` - Model definitions per provider (OpenAI, Claude, etc.)
  - `/openproviders` - AI provider abstraction layer
  - `/supabase` - Supabase client configuration
- `/components` - Shared UI components (shadcn/ui + Radix)
- `/utils` - Global utilities

### Hybrid Architecture Pattern
Rōmy works with or without Supabase:
- **With Supabase**: Full persistence, authentication, file storage
- **Without Supabase**: Local-only mode using IndexedDB, guest access only
- All database calls check `isSupabaseEnabled` flag before executing
- Fallback pattern: Try Supabase → fallback to IndexedDB cache

### State Management
Uses **React Context + React Query** (NOT Zustand despite dependency):
- `UserPreferencesProvider` - UI settings (layout, prompt suggestions, hidden models)
- `ModelProvider` - Available models, user key status, favorite models
- `UserProvider` - User profile with realtime updates
- `ChatsProvider` - Chat list with optimistic updates
- `MessagesProvider` - Messages for current chat
- `ChatSessionProvider` - Current chat ID from URL

All providers use:
1. React Context for state
2. React Query (`useQuery`/`useMutation`) for server state caching
3. IndexedDB for client-side persistence
4. Supabase for cloud sync (when enabled)

### AI Model Integration

**Model Configuration**: `/lib/models/index.ts` and `/lib/models/data/*.ts`
- Each model defined with capabilities (vision, tools, audio, reasoning, webSearch)
- Performance ratings (speed, intelligence)
- Pricing (inputCost, outputCost per 1M tokens)
- `apiSdk` function returns `LanguageModelV1` instance

**Provider Abstraction**: `/lib/openproviders/index.ts`
- `openproviders(modelId, apiKey)` routes to appropriate AI SDK provider
- Handles environment keys vs user-provided keys
- Supports 8 providers + Ollama local models

**Streaming Flow**: `/app/api/chat/route.ts`
1. Validate user, chat, model
2. Check rate limits (`checkUsageByModel`)
3. Log user message to Supabase
4. Delete newer messages if editing (via `editCutoffTimestamp`)
5. Call `streamText()` from Vercel AI SDK
6. `onFinish` callback saves assistant response with parts (text, tool invocations, reasoning)
7. Return `toDataStreamResponse()` for streaming

### Database Schema (Supabase)
**Tables**:
- `users` - Profile, message counts, daily limits, premium status, system_prompt
- `chats` - Chat metadata (title, model, created_at, pinned, system_prompt)
- `messages` - Content, role, experimental_attachments (JSONB), parts (JSONB), message_group_id, model
- `user_keys` - Encrypted API keys (BYOK feature)
- `user_preferences` - Layout, prompt_suggestions, show_tool_invocations, hidden_models
- `projects` - Project organization
- `chat_attachments` - File metadata
- `feedback` - User feedback

**Storage Buckets**: `chat-attachments`, `avatars`

See `INSTALL.md` for full SQL schema with RLS policies.

### File Uploads
**File**: `/lib/file-handling.ts`
- Max 10MB per file
- Allowed types: Images (JPEG/PNG/GIF), PDFs, text, JSON, CSV, Excel
- File type validation via `file-type` library (magic bytes check)
- Uploads to Supabase `chat-attachments` bucket
- Stored in `messages.experimental_attachments` as JSONB
- Daily limit: 5 files per authenticated user

### Rate Limiting
**File**: `/lib/usage.ts`, `/lib/config.ts`
- Unauthenticated: 5 messages/day (only `gpt-4.1-nano`)
- Authenticated free tier: 1000 messages/day
- Pro tier: 100 messages/month (resets at billing cycle)
- Max tier: Unlimited messages
- Ultra tier: Unlimited messages + access to all premium models
- Pro models: 500 calls total per user (legacy - now handled by subscription tiers)
- File uploads: 5/day (free), 20/day (Pro), unlimited (Max/Ultra)
- Tracking via `users.daily_message_count` and `users.monthly_message_count` with resets at billing cycle

### Subscription System (Autumn Integration)
**Overview**: Rōmy uses [Autumn](https://useautumn.com) for subscription management. Autumn acts as a complete subscription database - **no webhooks needed**. All subscription state is managed by Autumn and accessed via their SDK.

**Files**:
- `/lib/subscriptions/` - Subscription types, config, and access control helpers
- `/lib/subscriptions/autumn-check.ts` - Autumn check/track API integration
- `/app/api/autumn/[...all]/route.ts` - Autumn API handler (auto-creates `/api/autumn/*` endpoints)
- `/app/pricing/` - Pricing page with MM PricingComponent
- `/migrations/004_add_subscription_fields.sql` - Database schema for local analytics (optional)

**Subscription Tiers** (from `subscription.md`):
1. **Free** - Default for authenticated users
   - 1000 messages/day
   - Access to free models only
   - 5 file uploads/day

2. **Pro ($29/month)** - Entry tier
   - 100 messages/month (hard monthly limit)
   - Access to Pro models
   - 20 file uploads/day
   - Email support

3. **Max ($89/month)** - Power user tier
   - Unlimited messages
   - Access to Pro models
   - Unlimited file uploads
   - Dedicated support

4. **Ultra ($200/month)** - Premium tier
   - Everything in Max
   - Access to ALL AI models (including premium)
   - Fundraising consultation
   - Priority support

**Key Functions**:
```typescript
// Autumn access control (in /lib/subscriptions/autumn-check.ts)
checkMessageAccess(customerId)    // Check if user can send messages
trackMessageUsage(customerId)     // Track message usage in Autumn

// React hook usage (from autumn-js/react)
const { customer, checkout, check, track } = useCustomer()
customer.products // Current subscriptions
checkout({ productId: 'pro' })  // Start checkout
check({ featureId: 'messages' }) // Check feature access
track({ featureId: 'messages', value: 1 }) // Track usage
```

**Checkout Flow**:
1. User visits `/pricing` page
2. Clicks "Get Started" on desired tier
3. `useCustomer().checkout({ productId: tier })` initiates checkout
4. User completes payment on Stripe-hosted page
5. **Autumn automatically updates subscription state**
6. User gains immediate access - no webhooks needed!

**Access Control Pattern**:
```typescript
// Using Autumn's check API (server-side)
import { checkMessageAccess } from '@/lib/subscriptions/autumn-check'

const access = await checkMessageAccess(userId)
if (!access.allowed) {
  throw new Error('Message limit reached. Please upgrade.')
}

// Using React hook (client-side)
const { check } = useCustomer()
const { data } = check({ featureId: 'messages' })
if (!data?.allowed) {
  // Show upgrade prompt
}
```

**Important Notes**:
- **No webhooks required** - Autumn manages all subscription state
- Use `useCustomer()` hook to access subscription info client-side
- Use `Autumn.check()` API for server-side access control
- Configure features in Autumn dashboard (e.g., "messages" feature)
- Database fields are optional - only for local analytics
- Anonymous users cannot subscribe (must authenticate first)

### Security Features
- **CSRF Protection**: Middleware validates tokens on POST/PUT/DELETE (see `/middleware.ts`, `/lib/csrf.ts`)
- **API Key Encryption**: User keys encrypted before storage (see `/lib/encryption.ts`)
- **CSP Headers**: Configured in middleware (stricter in production)
- **Input Sanitization**: `sanitizeUserInput()` before saving
- **Auth Verification**: All protected endpoints check session
- **RLS**: Supabase Row Level Security policies (must be configured)

## Key API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/chat` | POST | Stream AI responses via Vercel AI SDK |
| `/api/create-chat` | POST | Create new chat with optimistic updates |
| `/api/models` | GET | Get available models with access flags |
| `/api/models` | POST | Refresh model cache |
| `/api/user-preferences` | GET/PUT | User settings (synced to DB + localStorage) |
| `/api/user-preferences/favorite-models` | PUT | Save favorite models |
| `/api/user-key-status` | GET | Check which providers have user keys |
| `/api/user-keys` | POST/DELETE | Manage encrypted BYOK keys |
| `/api/toggle-chat-pin` | POST | Pin/unpin chat |
| `/api/update-chat-model` | POST | Change chat's default model |
| `/api/csrf` | GET | Get CSRF token |
| `/api/create-guest` | POST | Create anonymous user |

## Important Implementation Patterns

### Adding a New AI Provider
1. Create model definitions in `/lib/models/data/[provider].ts`
2. Add provider mapping in `/lib/openproviders/provider-map.ts`
3. Update `openproviders()` function to handle new provider
4. Add API key environment variable and update `getEffectiveApiKey()` in `/lib/user-keys.ts`
5. Update `.env.example` with new key

### Adding a New User Setting
1. Update `user_preferences` table schema in Supabase
2. Add property to `UserPreferences` type in `/lib/user-preference-store/types.ts`
3. Update `UserPreferencesProvider` in `/lib/user-preference-store/provider.tsx`
4. Update `/api/user-preferences` GET/PUT handlers
5. Add UI controls in settings component

### Message Editing Flow
When user edits a message:
1. Frontend sends `editCutoffTimestamp` in `/api/chat` request
2. Backend deletes all messages `WHERE created_at >= editCutoffTimestamp`
3. Logs new user message
4. Streams new assistant response
5. Old conversation branch is permanently deleted

### Optimistic Updates Pattern
Used throughout for better UX:
```typescript
// Example from ChatsProvider
setChats(prev => [...prev, optimisticChat])  // Immediate UI update
try {
  const realChat = await createChatInDb(...)
  setChats(prev => prev.map(c => c.id === tempId ? realChat : c))  // Replace with real data
} catch (error) {
  setChats(prev => prev.filter(c => c.id !== tempId))  // Revert on error
}
```

### IndexedDB Persistence Pattern
All chat state cached locally:
```typescript
// Fetch from Supabase
const chats = await fetchChatsFromSupabase(userId)
// Cache to IndexedDB
await writeToIndexedDB('chats', chats)
// On offline/error, read from cache
const cached = await readFromIndexedDB('chats')
```

### Ollama Integration
**File**: `/lib/models/data/ollama.ts`
- Polls `http://localhost:11434/api/tags` for available models
- Caches for 5 minutes
- Pattern-based detection (llama, qwen, deepseek, etc.)
- Auto-disabled in production (unless `OLLAMA_BASE_URL` set)
- Can be disabled in dev with `DISABLE_OLLAMA=true`

### Multi-Model Conversations
Each message stores its `model` field:
- Users can switch models mid-conversation
- UI shows which model generated each response
- Model stored in `messages.model` column

### PostHog Analytics Integration
**Files**: `/lib/posthog/*`
- Integrated following PostHog's official Next.js 15 app router best practices
- Automatic pageview tracking on route changes
- Privacy-first: `person_profiles: 'identified_only'` - only creates profiles for logged-in users
- Autocapture limited to clicks/submits on buttons/links
- Session recordings disabled by default (enable with `NEXT_PUBLIC_POSTHOG_ENABLE_RECORDINGS=true`)

**Usage**:
```typescript
// Import event tracking functions
import { trackChatCreated, trackMessageSent, trackModelSelected } from '@/lib/posthog'

trackChatCreated(chatId, model)
trackMessageSent({ chatId, model, hasAttachments: true, hasSearch: false })

// Or use the hook in React components
import { useAnalytics } from '@/lib/posthog'
const { track, identify, isAvailable } = useAnalytics()
```

**Key Features**:
- Pre-built tracking functions for all major user actions (chat, model, settings, files, search, auth)
- React hooks for component usage (`useAnalytics`, `useFeatureFlag`, `useIsFeatureEnabled`)
- Feature flags support for A/B testing
- Graceful degradation when PostHog is not configured
- Debug mode automatically enabled in development

**Configuration**: See `/lib/posthog/README.md` for complete documentation

### Exa Search Integration
**Dual Implementation Strategy** for maximum reliability and control:

**1. OpenRouter with Exa Engine** (`/lib/models/data/openrouter.ts`)
- Models configured with `engine: "exa"` in web search plugins
- Activated when user toggles search in chat input
- Automatically includes sources in streaming response
- No additional API key required (bundled with OpenRouter)

**2. Standalone Exa Tool** (`/lib/tools/exa-search.ts`)
- Separate tool implementation using `exa-js` package
- Provides full control over search parameters
- Features:
  - **Neural search**: Semantic understanding vs keyword matching
  - **Autoprompt**: Automatically enhances queries for better results
  - **Highlights**: Extracts key passages from results
  - **Configurable results**: 1-10 results (default: 5)
- Only active when:
  - `enableSearch` is true in chat request
  - `EXA_API_KEY` is configured in environment
- Tool automatically called by AI model when search needed

**Search Flow**:
```
User toggles search button
  → enableSearch=true sent to API
  → OpenRouter uses Exa engine for native search
  → Standalone Exa tool available for explicit searches
  → Sources extracted from response.parts
  → Displayed in SourcesList component
```

**Source Display** (`/app/components/chat/sources-list.tsx`):
- Automatic source extraction from both implementations
- Shows title, URL, domain, and favicon
- Collapsible list with expand/collapse animation
- UTM tracking for analytics
- Handles both `source` parts and `tool-invocation` results

**Configuration** (`/lib/exa/config.ts`):
- `isExaEnabled()`: Check if API key configured
- `EXA_DEFAULTS`: Neural search, 5 results, autoprompt enabled
- Graceful fallback if EXA_API_KEY missing

**Key Files**:
- `/lib/tools/exa-search.ts` - Main tool implementation
- `/lib/tools/types.ts` - Type definitions and schemas
- `/lib/exa/config.ts` - Configuration utilities
- `/app/api/chat/route.ts` - Tool integration (line 109-112)
- `/app/components/chat/get-sources.ts` - Source extraction
- `/app/components/chat/sources-list.tsx` - UI display

## Environment Variables

Required for full functionality:
```bash
# Supabase (optional - app works without it)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE=

# Security (required)
CSRF_SECRET=                    # 32-byte hex (use crypto.randomBytes)
ENCRYPTION_KEY=                 # 32-byte base64 (for BYOK)

# AI Model API Key (required)
OPENROUTER_API_KEY=             # Required for Grok 4.1 Fast model

# Exa Search (optional - for enhanced web search)
# Get your API key at https://exa.ai
# Used for standalone Exa tool (OpenRouter bundles Exa for native search)
EXA_API_KEY=                    # Optional - enables standalone Exa search tool

# PostHog Analytics (optional - for product analytics)
# Get your API key at https://posthog.com
NEXT_PUBLIC_POSTHOG_KEY=        # Optional - enables analytics tracking
NEXT_PUBLIC_POSTHOG_HOST=       # Optional - defaults to https://us.i.posthog.com
NEXT_PUBLIC_POSTHOG_ENABLE_RECORDINGS=false  # Optional - enable session recordings

# Autumn Payments (required for subscriptions)
# Get your API key from https://app.useautumn.com/dev
# No webhooks needed - Autumn handles all subscription state!
AUTUMN_SECRET_KEY=              # Server-side secret key

# Production Configuration (optional)
NEXT_PUBLIC_VERCEL_URL=         # Your production domain

# Development Tools (optional)
ANALYZE=false                   # Set to true to analyze bundle size
```

## Development Tips

### Testing Different Models
Models are defined in `/lib/models/data/[provider].ts` with metadata:
- Check `isPro` flag for rate limit tier
- `capabilities` object determines UI features (vision, tools, etc.)
- `speed` and `intelligence` affect model recommendations

### Debugging State Issues
State flows through multiple layers:
1. Check React Context Provider (e.g., `ChatsProvider`)
2. Check IndexedDB cache (browser DevTools → Application → IndexedDB)
3. Check Supabase tables (if enabled)
4. Check API route logs for errors

### Local Development Without Supabase
Remove Supabase env vars from `.env.local`:
- App falls back to IndexedDB-only mode
- Guest user automatically created
- No auth, file storage, or sync features
- Useful for testing offline functionality

### Working with the AI SDK
Streaming uses Vercel AI SDK (`ai` package):
- `streamText()` for chat responses
- `useChat()` hook in components for streaming state
- `Message` type from `ai` package (not custom type)
- Tool invocations stored in `message.parts` array

### Rate Limit Testing
Adjust limits in `/lib/config.ts`:
```typescript
export const DAILY_MESSAGE_LIMIT = 1000        // Authenticated users
export const GUEST_DAILY_MESSAGE_LIMIT = 5    // Guest users
export const DAILY_FILE_UPLOAD_LIMIT = 5
export const PRO_MODEL_LIMIT = 500            // Lifetime for pro models
```

## Common Pitfalls

1. **Don't use Zustand** - It's a dependency but not actively used. Use React Context.
2. **Always check `isSupabaseEnabled`** before database calls
3. **Use optimistic updates** for better UX, but always revert on error
4. **File uploads require Supabase** - No local-only fallback
5. **CSRF tokens required** for POST/PUT/DELETE - Frontend must fetch from `/api/csrf`
6. **Message parts are complex** - Contains text, tool invocations, reasoning (see `/app/api/chat/db.ts`)
7. **Model IDs must match exactly** - Check `model.id` in model definitions
8. **Encryption key must be 32 bytes** - Base64-encoded for BYOK feature

## Testing & Building

```bash
# Type check before committing
npm run type-check

# Build and test production bundle locally
npm run build
npm start

# Analyze bundle size
npm run build -- --analyze
```

## Additional Resources

- See `INSTALL.md` for complete setup instructions
- See `README.md` for feature overview
- Model definitions: `/lib/models/data/*.ts`
- API route handlers: `/app/api/**/route.ts`
- Type definitions: `/app/types/*` and `/lib/*/types.ts`
