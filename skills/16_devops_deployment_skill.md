# Skill File 16 — DevOps & Deployment

## Overview
Configure the deployment pipeline: multi-stage Docker builds, Kubernetes manifests for EKS, CI/CD with GitHub Actions, blue/green deployments with rollback, monitoring (Sentry, CloudWatch, X-Ray), and production readiness checklist.

**BRD References:** Section 5.1 (Containerization, Orchestration), NFR-SCAL-001–004, NFR-AVAIL-001–005, NFR-SEC-001–002, NFR-MAINT-006–008

---

## 1. API Dockerfile — `Dockerfile.api`

```dockerfile
# ─── Stage 1: Build ─────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Copy workspace root files
COPY package.json package-lock.json turbo.json tsconfig.base.json ./

# Copy workspace packages
COPY apps/api/package.json apps/api/tsconfig.json apps/api/
COPY packages/shared/package.json packages/shared/tsconfig.json packages/shared/

# Install dependencies
RUN npm ci --workspace=@platform/api --workspace=@platform/shared

# Copy source code
COPY packages/shared/ packages/shared/
COPY apps/api/ apps/api/

# Generate Prisma client
RUN cd apps/api && npx prisma generate

# Build
RUN npm run build --workspace=@platform/shared
RUN npm run build --workspace=@platform/api

# ─── Stage 2: Production ────────────────────────────────────────────
FROM node:22-alpine AS production

WORKDIR /app

# Security: run as non-root
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser

# Copy built artifacts
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/node_modules/.prisma ./apps/api/node_modules/.prisma
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

# Copy package files for Node module resolution
COPY --from=builder /app/package.json ./
COPY --from=builder /app/apps/api/package.json ./apps/api/

USER appuser

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

CMD ["node", "apps/api/dist/index.js"]
```

---

## 2. Web Dockerfile — `Dockerfile.web`

```dockerfile
# ─── Stage 1: Build ─────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json turbo.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/tsconfig.json apps/web/
COPY packages/shared/package.json packages/shared/tsconfig.json packages/shared/

RUN npm ci --workspace=@platform/web --workspace=@platform/shared

COPY packages/shared/ packages/shared/
COPY apps/web/ apps/web/

RUN npm run build --workspace=@platform/shared
RUN npm run build --workspace=@platform/web

# ─── Stage 2: Serve with Nginx ──────────────────────────────────────
FROM nginx:1.27-alpine AS production

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# SPA routing support
RUN echo 'server { \
    listen 80; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { try_files $uri $uri/ /index.html; } \
    location /api { proxy_pass http://api-service:4000; } \
    gzip on; \
    gzip_types text/plain text/css application/json application/javascript text/xml; \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80 || exit 1
```

---

## 3. Kubernetes Manifests — `k8s/`

### API Deployment — `k8s/api-deployment.yaml`

```yaml
# NFR-SCAL-001: Horizontal auto-scaling via K8s HPA.
# NFR-AVAIL-005: Blue/green deployment strategy.
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  labels:
    app: ai-analytics-api
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: ai-analytics-api
  template:
    metadata:
      labels:
        app: ai-analytics-api
    spec:
      containers:
        - name: api
          image: ${ECR_REGISTRY}/ai-analytics-api:${IMAGE_TAG}
          ports:
            - containerPort: 4000
          envFrom:
            - secretRef:
                name: api-secrets
            - configMapRef:
                name: api-config
          resources:
            requests:
              cpu: 250m
              memory: 512Mi
            limits:
              cpu: 1000m
              memory: 1Gi
          readinessProbe:
            httpGet:
              path: /health
              port: 4000
            initialDelaySeconds: 10
            periodSeconds: 5
          livenessProbe:
            httpGet:
              path: /health
              port: 4000
            initialDelaySeconds: 30
            periodSeconds: 10
          lifecycle:
            preStop:
              exec:
                command: ["sh", "-c", "sleep 10"]  # Graceful drain
---
apiVersion: v1
kind: Service
metadata:
  name: api-service
spec:
  selector:
    app: ai-analytics-api
  ports:
    - port: 4000
      targetPort: 4000
  type: ClusterIP
```

### HPA — `k8s/api-hpa.yaml`

```yaml
# NFR-SCAL-001: Add pods when CPU > 70%, max 20 pods.
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

### Ingress — `k8s/ingress.yaml`

```yaml
# ARC-API-001: API Gateway / Ingress Controller.
# NFR-SEC-002: TLS 1.3 termination.
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ai-analytics-ingress
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/certificate-arn: ${ACM_CERT_ARN}
    alb.ingress.kubernetes.io/ssl-policy: ELBSecurityPolicy-TLS13-1-2-2021-06
    alb.ingress.kubernetes.io/healthcheck-path: /health
    alb.ingress.kubernetes.io/target-type: ip
spec:
  rules:
    - host: api.platform.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api-service
                port:
                  number: 4000
  tls:
    - hosts:
        - api.platform.com
```

---

## 4. GitHub Actions CI/CD — `.github/workflows/deploy.yml`

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '22'
  ECR_REGISTRY: ${{ secrets.AWS_ECR_REGISTRY }}

jobs:
  # ─── Lint & Test ──────────────────────────────────────────────────
  test:
    runs-on: ubuntu-latest
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: password
          MYSQL_DATABASE: ai_analytics_test
        ports: ['3306:3306']
        options: --health-cmd="mysqladmin ping" --health-interval=10s
      redis:
        image: redis:7-alpine
        ports: ['6379:6379']

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: npm

      - run: npm ci

      # NFR-MAINT-003: ESLint + Prettier in CI
      - name: Lint
        run: npm run lint

      - name: Type Check
        run: npx turbo run build --filter=@platform/shared

      # NFR-MAINT-004: Unit tests with coverage
      - name: Unit Tests
        run: npm run test -- --coverage
        env:
          DATABASE_URL: mysql://root:password@localhost:3306/ai_analytics_test
          REDIS_URL: redis://localhost:6379/1
          JWT_SECRET: ci-test-secret-key-32-characters-long
          GOOGLE_GENAI_API_KEY: test-key

      - name: Upload Coverage
        uses: codecov/codecov-action@v4
        with:
          files: apps/api/coverage/lcov.info

  # ─── Build & Push Docker Images ───────────────────────────────────
  build:
    needs: test
    if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/staging'
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Login to ECR
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build & Push API
        run: |
          IMAGE_TAG=${GITHUB_SHA::8}
          docker build -f Dockerfile.api -t $ECR_REGISTRY/ai-analytics-api:$IMAGE_TAG .
          docker push $ECR_REGISTRY/ai-analytics-api:$IMAGE_TAG

      - name: Build & Push Web
        run: |
          IMAGE_TAG=${GITHUB_SHA::8}
          docker build -f Dockerfile.web -t $ECR_REGISTRY/ai-analytics-web:$IMAGE_TAG .
          docker push $ECR_REGISTRY/ai-analytics-web:$IMAGE_TAG

  # ─── Deploy to EKS ───────────────────────────────────────────────
  deploy:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Update kubeconfig
        run: aws eks update-kubeconfig --name ai-analytics-cluster

      - name: Run Prisma Migrations
        run: |
          kubectl run migration --image=$ECR_REGISTRY/ai-analytics-api:${GITHUB_SHA::8} \
            --restart=Never --rm -i -- npx prisma migrate deploy

      # NFR-AVAIL-005: Rolling deployment with rollback
      - name: Deploy to EKS
        run: |
          IMAGE_TAG=${GITHUB_SHA::8}
          kubectl set image deployment/api api=$ECR_REGISTRY/ai-analytics-api:$IMAGE_TAG
          kubectl set image deployment/web web=$ECR_REGISTRY/ai-analytics-web:$IMAGE_TAG
          kubectl rollout status deployment/api --timeout=300s

      - name: Rollback on Failure
        if: failure()
        run: |
          kubectl rollout undo deployment/api
          kubectl rollout undo deployment/web
```

---

## 5. Monitoring Setup

### Sentry Integration — `apps/api/src/utils/sentry.ts`

```typescript
/**
 * NFR-MAINT-008: Sentry for error tracking with source map support.
 */

import * as Sentry from '@sentry/node';
import { env } from '../config/env.js';

export function initSentry(): void {
  if (env.SENTRY_DSN) {
    Sentry.init({
      dsn: env.SENTRY_DSN,
      environment: env.NODE_ENV,
      tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
      integrations: [
        Sentry.httpIntegration(),
        Sentry.expressIntegration(),
      ],
    });
  }
}
```

---

## 6. Production Readiness Checklist

| Category | Check | BRD Req |
|----------|-------|---------|
| **Security** | TLS 1.3 enabled | NFR-SEC-002 |
| | Secrets in AWS Secrets Manager | NFR-SEC-007 |
| | WAF configured | NFR-SEC-004 |
| | RLS/CLS enforced | NFR-SEC-005 |
| | Audit logs active (7yr retention) | NFR-SEC-006 |
| | Data at rest encrypted | NFR-SEC-001 |
| **Performance** | p95 query < 5s | NFR-PERF-001 |
| | p95 Gemini < 3s | NFR-PERF-002 |
| | Page load < 2s | NFR-PERF-003 |
| | Widget render < 500ms cached | NFR-PERF-004 |
| | Redis cache hit > 60% | NFR-PERF-005 |
| **Scalability** | HPA configured (max 20 pods) | NFR-SCAL-001 |
| | Read replicas for analytics | NFR-SCAL-002 |
| | Redis cluster + Sentinel | NFR-SCAL-003 |
| **Availability** | 99.9% uptime SLA | NFR-AVAIL-001 |
| | Gemini API circuit breaker works | NFR-AVAIL-002 |
| | Circuit breakers on external calls | NFR-AVAIL-003 |
| | DB connection failover | NFR-AVAIL-004 |
| | Blue/green with auto-rollback | NFR-AVAIL-005 |
| **Monitoring** | Winston → CloudWatch Logs | NFR-MAINT-006 |
| | AWS X-Ray tracing | NFR-MAINT-007 |
| | Sentry error tracking | NFR-MAINT-008 |
| | Correlation IDs on all requests | NFR-MAINT-006 |
| **Testing** | Unit test coverage ≥70% | NFR-MAINT-004 |
| | Integration tests pass | NFR-MAINT-005 |
| | E2E tests pass | NFR-MAINT-005 |
| | AI evaluation report generated | AI-EVAL-001 |

---

## 7. Verification Checklist

| Step | Command | Expected |
|------|---------|----------|
| Docker API builds | `docker build -f Dockerfile.api .` | Image builds successfully |
| Docker Web builds | `docker build -f Dockerfile.web .` | Image builds successfully |
| Docker Compose up | `docker compose up` | MySQL + Redis running |
| Health check | `curl localhost:4000/health` | `{ status: "healthy" }` |
| K8s deploy | `kubectl apply -f k8s/` | All resources created |
| HPA scales | Load test with k6/artillery | Pods scale up past 3 |
| Rollback works | Deploy bad image | Auto-rollback triggered |
| Sentry captures | Trigger unhandled error | Error appears in Sentry |
| CI pipeline passes | Push to `main` | All jobs green |

---

## 🎉 All Skills Complete

This concludes the full skill file set for the AI-Powered Research and Analytics Platform. The 17 skill files cover:

| # | Skill | Domain |
|---|-------|--------|
| 00 | Project Setup | Monorepo, tooling, config |
| 01 | Database Schema | Prisma models, MySQL |
| 02 | Auth & Authorization | JWT, RBAC, bcrypt, lockout |
| 03 | DB Connectivity | Multi-DB connectors, schema discovery, caching |
| 04 | Semantic Layer | Metrics, dimensions, prompt formatting |
| 05 | AI NL2SQL Engine | Gemini, prompts, SQL validation |
| 06 | Query Execution | Caching, SSE, conversation pipeline |
| 07 | Visualization Frontend | Charts, confidence, lineage, narrative |
| 08 | Dashboard Builder | Drag-and-drop grid, widgets, cross-filtering |
| 09 | File Upload | S3, parsing, ephemeral tables |
| 10 | Saved Queries | Templates, sharing, execution history |
| 11 | Collaboration | Comments, annotations, @mentions |
| 12 | Embedded Analytics | iFrame, SDK, GraphQL, white-labeling |
| 13 | Express Bootstrap | Route wiring, error handling, job queues |
| 14 | React Frontend | Vite, Zustand, TanStack Query, routing |
| 15 | Testing & QA | Unit, integration, E2E, AI evaluation |
| 16 | DevOps & Deployment | Docker, K8s, CI/CD, monitoring |
