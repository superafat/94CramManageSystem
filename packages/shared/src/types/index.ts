// 共用 TypeScript Types

export type System = '94manage' | '94inclass' | '94stock';
export type Role = 'admin' | 'teacher' | 'staff' | 'parent' | 'student';

export type { ApiResponse, SuccessResponse, ErrorResponse, BaseResponse } from './api-response';
export { createSuccessResponse, createErrorResponse } from './api-response';

export interface PaginatedResponse<T> {
  success: boolean;
  data?: T[];
  error?: string;
  message?: string;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
