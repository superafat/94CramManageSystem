// 共用 TypeScript Types

export type System = '94manage' | '94inclass' | '94stock';
export type Role = 'admin' | 'teacher' | 'staff' | 'parent' | 'student';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
