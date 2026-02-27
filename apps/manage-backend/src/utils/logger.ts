import { createLogger } from '@94cram/shared';

export const logger = createLogger('manage-backend');

// Child logger helper for contextual logging
export function createChildLogger(context: Record<string, unknown>) {
  return logger.child(context);
}
