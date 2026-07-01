# Skill File 00 — Project Setup & Monorepo Foundation

## Overview
Set up the monorepo scaffold, package managers, TypeScript configuration, environment variables, linting, and the shared utilities package. This is the **foundation** every other module imports from.

**BRD References:** NFR-MAINT-001 (Monorepo), NFR-MAINT-002 (TypeScript strict), NFR-MAINT-003 (ESLint/Prettier), Section 5.1 (Architecture), Section 7 (Tech Stack)

---

## 1. Monorepo Directory Structure

```
e:\Altzor - Analysis\
├── .env                              # Root secrets (NEVER committed)
├── .env.example                      # Template for other developers
├── .gitignore
├── .eslintrc.cjs                     # Shared ESLint config
├── .prettierrc                       # Shared Prettier config
├── turbo.json                        # Turborepo pipeline config
├── package.json                      # Root workspace definition
├── tsconfig.base.json                # Base TypeScript config
├── docker-compose.yml                # Local dev: MySQL, Redis
├── Dockerfile.api                    # Multi-stage API build
├── Dockerfile.web                    # Multi-stage Web build
│
├── apps/
│   ├── api/                          # Tier 2 — Express.js Backend
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── prisma/
│   │   │   ├── schema.prisma         # Prisma schema (MySQL)
│   │   │   └── migrations/           # Auto-generated migrations
│   │   └── src/
│   │       ├── index.ts              # Express app bootstrap
│   │       ├── config/
│   │       │   ├── env.ts            # Environment variable loader (Zod-validated)
│   │       │   ├── db.ts             # Prisma client singleton
│   │       │   └── redis.ts          # Redis client singleton
│   │       ├── middleware/
│   │       │   ├── auth.ts           # JWT verification middleware
│   │       │   ├── rbac.ts           # Role-based access guard
│   │       │   ├── rateLimiter.ts    # Rate limiting (express-rate-limit)
│   │       │   ├── errorHandler.ts   # Global error handler
│   │       │   └── correlationId.ts  # Request correlation ID
│   │       ├── routes/
│   │       │   ├── auth.routes.ts
│   │       │   ├── connections.routes.ts
│   │       │   ├── conversations.routes.ts
│   │       │   ├── dashboards.routes.ts
│   │       │   ├── files.routes.ts
│   │       │   ├── queries.routes.ts
│   │       │   ├── semantic.routes.ts
│   │       │   ├── admin.routes.ts
│   │       │   └── embed.routes.ts
│   │       ├── services/
│   │       │   ├── ai/               # Gemini AI integration
│   │       │   ├── auth/             # JWT, bcrypt, session logic
│   │       │   ├── connectors/       # Multi-database connectors
│   │       │   ├── query/            # SQL validation, execution
│   │       │   ├── files/            # File upload, parsing, S3
│   │       │   ├── dashboard/        # Dashboard CRUD + widgets
│   │       │   ├── semantic/         # Semantic layer management
│   │       │   └── collaboration/    # Comments, annotations, mentions
│   │       ├── jobs/                 # BullMQ job processors
│   │       │   ├── schemaSync.job.ts
│   │       │   ├── reportDelivery.job.ts
│   │       │   └── alertProcessor.job.ts
│   │       └── utils/
│   │           ├── logger.ts         # Winston + CloudWatch
│   │           ├── circuitBreaker.ts # Circuit breaker pattern
│   │           └── crypto.ts         # AES-256-GCM encryption
│   │
│   └── web/                          # Tier 1 — React Frontend
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       ├── index.html
│       └── src/
│           ├── main.tsx              # React entry point
│           ├── App.tsx               # Root component + router
│           ├── stores/               # Zustand stores
│           ├── hooks/                # TanStack Query hooks
│           ├── components/           # Reusable UI components
│           │   ├── ui/               # shadcn/ui primitives
│           │   ├── chat/             # Conversational query UI
│           │   ├── charts/           # Recharts wrappers
│           │   ├── dashboard/        # Dashboard grid & widgets
│           │   └── shared/           # Layout, nav, loading, etc.
│           ├── pages/                # Route-level page components
│           ├── lib/                  # Client utilities
│           │   ├── api.ts            # Axios/fetch instance
│           │   ├── sse.ts            # SSE streaming client
│           │   └── auth.ts           # Token management
│           └── styles/               # Global CSS / Tailwind config
│
└── packages/
    └── shared/                       # Shared types & utilities
        ├── package.json
        ├── tsconfig.json
        └── src/
            ├── index.ts
            ├── types/
            │   ├── auth.ts           # User, Role, Session types
            │   ├── database.ts       # Connection, Schema types
            │   ├── query.ts          # Query, Result, Metadata types
            │   ├── dashboard.ts      # Dashboard, Widget types
            │   ├── conversation.ts   # Message, Conversation types
            │   ├── semantic.ts       # Metric, Dimension types
            │   └── api.ts            # API request/response envelopes
            ├── constants/
            │   ├── roles.ts          # RBAC role definitions
            │   ├── dbDialects.ts     # Supported DB dialects
            │   └── limits.ts         # Rate limits, quotas, timeouts
            └── utils/
                ├── validation.ts     # Shared Zod schemas
                └── formatting.ts     # Date, number formatters
```

---

## 2. Root package.json

```json
{
  "name": "ai-analytics-platform",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo run dev",
    "dev:api": "turbo run dev --filter=@platform/api",
    "dev:web": "turbo run dev --filter=@platform/web",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "format": "prettier --write .",
    "test": "turbo run test",
    "test:e2e": "turbo run test:e2e",
    "db:migrate": "turbo run db:migrate --filter=@platform/api",
    "db:seed": "turbo run db:seed --filter=@platform/api",
    "prepare": "husky"
  },
  "devDependencies": {
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "eslint": "^8.57.0",
    "eslint-config-prettier": "^9.1.0",
    "husky": "^9.0.0",
    "lint-staged": "^15.2.0",
    "prettier": "^3.3.0",
    "turbo": "^2.0.0",
    "typescript": "^5.4.0"
  },
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,css}": ["prettier --write"]
  },
  "engines": {
    "node": ">=22.0.0"
  }
}
```

---

## 3. tsconfig.base.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "forceConsistentCasingInFileNames": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "isolatedModules": true,
    "resolveJsonModule": true
  },
  "exclude": ["node_modules", "dist"]
}
```

> **NFR-MAINT-002:** `strict: true` is enforced. No `any` escape hatches in production code.

---

## 4. .eslintrc.cjs

```js
/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
  },
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "prettier",
  ],
  rules: {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "no-console": ["warn", { allow: ["warn", "error"] }],
  },
  ignorePatterns: ["dist/", "node_modules/", "*.js", "*.cjs"],
};
```

---

## 5. .prettierrc

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always"
}
```

---

## 6. turbo.json

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [".env"],
  "tasks": {
    "dev": {
      "cache": false,
      "persistent": true
    },
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "lint": {},
    "test": {
      "dependsOn": ["build"]
    },
    "test:e2e": {
      "dependsOn": ["build"]
    },
    "db:migrate": {
      "cache": false
    },
    "db:seed": {
      "cache": false
    }
  }
}
```

---

## 7. .env.example

```env
# ── Application ──────────────────────────────
NODE_ENV=development
PORT=4000

# ── MySQL (Primary Database) ─────────────────
DATABASE_URL=mysql://root:password@localhost:3306/ai_analytics
DATABASE_URL_READ=mysql://readonly:password@localhost:3307/ai_analytics

# ── Redis ────────────────────────────────────
REDIS_URL=redis://localhost:6379
REDIS_CLUSTER_MODE=false

# ── JWT / Auth ───────────────────────────────
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
BCRYPT_ROUNDS=12

# ── Gemini API (Primary AI) ──────────────────
GOOGLE_GENAI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.5-flash

# ── AWS ──────────────────────────────────────
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
S3_BUCKET=ai-analytics-uploads
AWS_SES_FROM_EMAIL=no-reply@platform.com

# ── AWS Secrets Manager ─────────────────────
USE_SECRETS_MANAGER=false

# ── File Upload ──────────────────────────────
MAX_FILE_SIZE_MB=500
MAX_ROW_COUNT=5000000

# ── Query Execution ─────────────────────────
QUERY_TIMEOUT_DEFAULT_MS=30000
QUERY_TIMEOUT_MAX_MS=300000
RESULT_CACHE_TTL_SECONDS=3600
SCHEMA_CACHE_TTL_SECONDS=300

# ── BullMQ ───────────────────────────────────
BULL_CONCURRENCY=5

# ── Logging / Monitoring ────────────────────
LOG_LEVEL=info
SENTRY_DSN=
CLOUDWATCH_LOG_GROUP=ai-analytics-platform
```

---

## 8. docker-compose.yml — Local Development

```yaml
version: "3.9"

services:
  mysql:
    image: mysql:8.0
    container_name: analytics-mysql
    ports:
      - "3306:3306"
    environment:
      MYSQL_ROOT_PASSWORD: password
      MYSQL_DATABASE: ai_analytics
    volumes:
      - mysql_data:/var/lib/mysql
    command: >
      --default-authentication-plugin=mysql_native_password
      --character-set-server=utf8mb4
      --collation-server=utf8mb4_unicode_ci

  redis:
    image: redis:7-alpine
    container_name: analytics-redis
    ports:
      - "6379:6379"
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru

volumes:
  mysql_data:
```

---

## 9. .gitignore

```gitignore
# Dependencies
node_modules/
.pnp.*

# Build output
dist/
.turbo/
.next/

# Environment
.env
.env.local
.env.production

# IDE
.vscode/
.idea/
*.swp

# OS
.DS_Store
Thumbs.db

# Logs
*.log
logs/

# Testing
coverage/
playwright-report/

# Prisma
prisma/*.db
```

---

## 10. Husky Pre-commit Hook Setup

```bash
# After npm install at root
npx husky init
echo "npx lint-staged" > .husky/pre-commit
```

---

## 11. Verification Checklist

| Step | Command | Expected |
|------|---------|----------|
| Node version | `node -v` | `v22.x.x` |
| Install deps | `npm install` | No errors, workspaces linked |
| MySQL running | `docker compose up -d mysql` | Container `analytics-mysql` healthy |
| Redis running | `docker compose up -d redis` | Container `analytics-redis` healthy |
| TypeScript compiles | `npx turbo run build` | All packages build without errors |
| Lint passes | `npx turbo run lint` | No ESLint errors |
| Prisma generates | `cd apps/api && npx prisma generate` | Prisma client generated |

---

## Next Skill → `01_database_schema_skill.md`
