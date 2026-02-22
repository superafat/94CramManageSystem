# @94manage/api-client

統一的 API 客戶端，為 94Manage 前端應用提供類型安全、可靠的 API 調用層。

## 功能特性

- ✅ **類型安全**: 完整的 TypeScript 類型支持
- 🔐 **認證管理**: 自動處理 Bearer Token 和租戶 ID
- 🔄 **請求/響應攔截器**: 靈活的請求處理鏈
- ⚠️ **錯誤處理**: 統一的錯誤類型和處理機制
- 💾 **智能快取**: 內建記憶體快取，可配置 TTL
- 🔁 **自動重試**: 智能重試策略（區分 4xx/5xx）
- ⏱️ **超時控制**: 可配置的請求超時
- 🎯 **輕量級**: 零依賴（除 @94manage/errors）

## 安裝

```bash
pnpm add @94manage/api-client
```

## 快速開始

### 基礎使用

```typescript
import { APIClient } from '@94manage/api-client';

// 創建客戶端實例
const client = new APIClient({
  baseURL: 'http://localhost:3000',
  tenantId: 'demo-tenant',
  getAuthToken: () => localStorage.getItem('auth_token'),
});

// 發送請求
const students = await client.get<Student[]>('/admin/students');
const newStudent = await client.post<Student>('/admin/students', {
  name: '張三',
  email: 'zhang@example.com',
});
```

### 配置選項

```typescript
const client = new APIClient({
  baseURL: 'http://localhost:3000',
  tenantId: 'demo-tenant',
  
  // 認證配置
  getAuthToken: () => localStorage.getItem('auth_token'),
  
  // 超時配置（毫秒）
  timeout: 30000,
  
  // 快取配置
  enableCache: true,
  cacheTTL: 60000, // 1 分鐘
  
  // 重試配置
  enableRetry: true,
  retryCount: 3,
  retryDelay: 1000,
});
```

## 核心功能

### HTTP 方法

```typescript
// GET
const data = await client.get<T>('/path');
const data = await client.get<T>('/path', { params: { id: 1 } });

// POST
const result = await client.post<T>('/path', { name: 'test' });

// PUT
const result = await client.put<T>('/path/1', { name: 'updated' });

// PATCH
const result = await client.patch<T>('/path/1', { status: 'active' });

// DELETE
await client.delete('/path/1');
```

### 請求配置

```typescript
await client.get<User[]>('/users', {
  // 查詢參數
  params: { page: 1, limit: 10 },
  
  // 自定義 headers
  headers: { 'X-Custom': 'value' },
  
  // 快取控制
  useCache: false,
  
  // 重試控制
  retry: false,
  
  // 超時設置
  timeout: 5000,
  
  // 跳過攔截器
  skipInterceptors: false,
});
```

### 攔截器

```typescript
// 請求攔截器
const removeInterceptor = client.addRequestInterceptor(async (url, config) => {
  console.log('請求:', url);
  return { url, config };
});

// 響應攔截器
client.addResponseInterceptor(async (response) => {
  console.log('響應:', response.status);
  return response;
});

// 錯誤攔截器
client.addErrorInterceptor((error) => {
  console.error('錯誤:', error);
  throw error;
});

// 移除攔截器
removeInterceptor();
```

### 認證管理

```typescript
// 檢查認證狀態
const isAuth = await client.isAuthenticated();

// 設置 token
client.setAuthToken('new-token');

// 清除 token
client.clearAuthToken();
```

### 快取管理

```typescript
// 清空所有快取
client.clearCache();

// 清空匹配模式的快取
client.clearCacheByPattern('/admin/students');
client.clearCacheByPattern(/^\/admin/);
```

### 租戶管理

```typescript
// 設置租戶 ID
client.setTenantId('another-tenant');

// 獲取租戶 ID
const tenantId = client.getTenantId();
```

## 錯誤處理

### 錯誤類型

```typescript
import {
  APIError,
  NetworkError,
  TimeoutError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
} from '@94manage/api-client';

try {
  await client.get('/protected');
} catch (error) {
  if (error instanceof AuthenticationError) {
    // 401: 需要登入
    console.log('請登入');
  } else if (error instanceof AuthorizationError) {
    // 403: 無權限
    console.log('無權限訪問');
  } else if (error instanceof ValidationError) {
    // 422: 驗證錯誤
    console.log('資料驗證失敗');
  } else if (error instanceof TimeoutError) {
    // 請求超時
    console.log('請求超時');
  } else if (error instanceof NetworkError) {
    // 網路錯誤
    console.log('網路連線失敗');
  } else if (error instanceof APIError) {
    // 其他 API 錯誤
    console.log(`錯誤: ${error.statusCode}`);
  }
}
```

### 錯誤屬性

```typescript
catch (error) {
  if (error instanceof APIError) {
    error.message;      // 錯誤訊息
    error.statusCode;   // HTTP 狀態碼
    error.response;     // 原始 Response 對象
    error.data;         // 錯誤響應數據
    
    // 錯誤判斷
    error.isClientError();  // 是否為 4xx
    error.isServerError();  // 是否為 5xx
    error.isRetryable();    // 是否可重試
  }
}
```

## React 集成範例

### 創建 Hook

```typescript
// hooks/useAPIClient.ts
import { useMemo } from 'react';
import { APIClient } from '@94manage/api-client';

export function useAPIClient() {
  return useMemo(
    () => new APIClient({
      baseURL: import.meta.env.VITE_API_URL,
      tenantId: localStorage.getItem('tenant_id') || undefined,
      getAuthToken: () => localStorage.getItem('auth_token'),
    }),
    []
  );
}
```

### 數據獲取 Hook

```typescript
// hooks/useStudents.ts
import { useState, useEffect } from 'react';
import { useAPIClient } from './useAPIClient';
import type { Student } from '@94manage/types';

export function useStudents() {
  const client = useAPIClient();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    client.get<Student[]>('/admin/students')
      .then(setStudents)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [client]);

  return { students, loading, error };
}
```

## Next.js 集成範例

### Server Actions

```typescript
// app/actions/students.ts
'use server';

import { APIClient } from '@94manage/api-client';
import { cookies } from 'next/headers';

const getClient = () => new APIClient({
  baseURL: process.env.API_URL!,
  getAuthToken: async () => {
    const cookieStore = await cookies();
    return cookieStore.get('auth_token')?.value || null;
  },
});

export async function getStudents() {
  const client = getClient();
  return client.get<Student[]>('/admin/students');
}
```

### Client Component

```typescript
// components/StudentList.tsx
'use client';

import { useEffect, useState } from 'react';
import { APIClient } from '@94manage/api-client';

const client = new APIClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL!,
  getAuthToken: () => localStorage.getItem('auth_token'),
});

export function StudentList() {
  const [students, setStudents] = useState([]);
  
  useEffect(() => {
    client.get('/admin/students').then(setStudents);
  }, []);
  
  return <div>...</div>;
}
```

## 進階用法

### 自定義攔截器範例

```typescript
// 添加請求日誌
client.addRequestInterceptor((url, config) => {
  console.log(`[API] ${config.method} ${url}`);
  return { url, config };
});

// 添加請求 ID
client.addRequestInterceptor((url, config) => {
  const headers = new Headers(config.headers);
  headers.set('X-Request-ID', crypto.randomUUID());
  return { url, config: { ...config, headers } };
});

// 響應時間監控
client.addRequestInterceptor((url, config) => {
  (config as any)._startTime = Date.now();
  return { url, config };
});

client.addResponseInterceptor((response) => {
  const startTime = (response as any)._startTime;
  if (startTime) {
    console.log(`響應時間: ${Date.now() - startTime}ms`);
  }
  return response;
});

// 全局錯誤處理
client.addErrorInterceptor((error) => {
  if (error instanceof AuthenticationError) {
    // 跳轉到登入頁
    window.location.href = '/login';
  }
  throw error;
});
```

## 最佳實踐

1. **單例模式**: 在應用中創建一個全局 APIClient 實例
2. **錯誤邊界**: 使用 React Error Boundary 捕獲 API 錯誤
3. **快取策略**: 對不常變動的數據啟用快取
4. **重試策略**: 區分可重試和不可重試的錯誤
5. **類型安全**: 為所有 API 調用定義明確的類型

## License

MIT
