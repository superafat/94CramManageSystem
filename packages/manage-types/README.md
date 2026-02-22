# @94manage/types

Unified TypeScript type definitions for the 94Manage multi-tenant SaaS platform.

## Overview

This package contains all shared type definitions extracted from the database schema, providing type safety across the entire monorepo (backend, dashboard, miniapp).

## Installation

Within the monorepo workspace:

```bash
pnpm add @94manage/types --workspace
```

## Usage

```typescript
import type { Tenant, User, Notification, NotificationType } from '@94manage/types'

// Use types in your code
const tenant: Tenant = {
  id: 'uuid',
  name: 'My Organization',
  slug: 'my-org',
  plan: 'pro',
  // ...
}
```

## Available Types

### Enums
- `TenantPlan`: free | basic | pro | enterprise
- `TrialStatus`: none | pending | approved | rejected | expired
- `UserRole`: parent | teacher | admin | super_admin
- `Channel`: telegram | line | web | email
- `NotificationType`: schedule_change | billing_reminder | attendance_alert | grade_notification
- `NotificationChannel`: telegram | line | email
- `NotificationStatus`: pending | sent | failed | skipped

### Entity Types
- `Tenant` / `NewTenant` - Multi-tenant organization
- `Branch` / `NewBranch` - Physical location or department
- `User` / `NewUser` - System user
- `UserPermission` / `NewUserPermission` - User permissions
- `Conversation` / `NewConversation` - AI chat interactions
- `KnowledgeChunk` / `NewKnowledgeChunk` - RAG knowledge base entries
- `Notification` / `NewNotification` - System notifications
- `NotificationPreference` / `NewNotificationPreference` - User notification settings

## Development

Build the types:

```bash
pnpm build
```

Watch mode:

```bash
pnpm dev
```

## Structure

```
packages/types/
├── src/
│   ├── index.ts      # Main export
│   └── schema.ts     # All type definitions
├── dist/             # Compiled output
├── package.json
└── tsconfig.json
```

## License

MIT
