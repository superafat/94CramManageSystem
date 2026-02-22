/**
 * 統一的日誌格式化工具
 */

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  context?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

/**
 * 格式化時間戳為 ISO 8601 格式
 */
export function formatTimestamp(date: Date = new Date()): string {
  return date.toISOString();
}

/**
 * 創建結構化日誌條目
 */
export function formatLog(
  level: LogEntry['level'],
  message: string,
  context?: Record<string, any>,
  error?: Error
): LogEntry {
  const logEntry: LogEntry = {
    timestamp: formatTimestamp(),
    level,
    message,
  };

  if (context && Object.keys(context).length > 0) {
    logEntry.context = context;
  }

  if (error) {
    logEntry.error = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return logEntry;
}

/**
 * 將日誌條目轉換為 JSON 字符串
 */
export function stringifyLog(logEntry: LogEntry): string {
  return JSON.stringify(logEntry);
}

/**
 * 快捷方法：創建並格式化日誌
 */
export function createLog(
  level: LogEntry['level'],
  message: string,
  context?: Record<string, any>,
  error?: Error
): string {
  return stringifyLog(formatLog(level, message, context, error));
}
