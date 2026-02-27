/**
 * 統一日誌系統 — 使用 pino
 * 三個系統共用：manage / inclass / stock / bot-gateway
 */
import pino from 'pino';

export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';

export interface LoggerOptions {
  level?: LogLevel;
  pretty?: boolean;
}

/**
 * 建立 logger 實例
 * @param service 服務名稱（如 'manage-backend'）
 * @param options 選項
 */
export function createLogger(service: string, options?: LoggerOptions) {
  const level = options?.level || (process.env.LOG_LEVEL as LogLevel) || 'info';
  const isDev = process.env.NODE_ENV !== 'production';
  const usePretty = options?.pretty ?? isDev;

  const transport = usePretty
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss.l',
          ignore: 'pid,hostname',
        },
      }
    : undefined;

  return pino({
    name: service,
    level,
    ...(transport ? { transport } : {}),
    // Cloud Run 自動抓取 severity 欄位
    formatters: {
      level(label: string) {
        return { severity: label.toUpperCase(), level: label };
      },
    },
    // 生產環境用 JSON，Cloud Logging 自動解析
    timestamp: pino.stdTimeFunctions.isoTime,
  });
}

export type Logger = ReturnType<typeof createLogger>;
