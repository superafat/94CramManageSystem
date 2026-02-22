/**
 * Security utilities for defensive programming
 * Provides input sanitization, SQL injection and XSS protection
 */

/**
 * Sanitize user input to prevent XSS attacks
 * @param input - User input string
 * @returns Sanitized string with HTML entities escaped
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize HTML content while preserving safe tags
 * @param html - HTML content
 * @returns Sanitized HTML with only safe tags
 */
export function sanitizeHtml(html: string): string {
  if (typeof html !== 'string') {
    return '';
  }
  
  // Remove script tags and event handlers
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '');
}

/**
 * Validate and sanitize SQL input to prevent SQL injection
 * @param input - User input for SQL query
 * @returns Sanitized input safe for SQL
 */
export function sanitizeSqlInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Remove SQL injection patterns
  return input
    .replace(/[';-]/g, '')
    .replace(/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi, '')
    .trim();
}

/**
 * Check if string contains SQL injection patterns
 * @param input - String to check
 * @returns True if suspicious patterns detected
 */
export function hasSqlInjectionPattern(input: string): boolean {
  if (typeof input !== 'string') {
    return false;
  }
  
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
    /[';-]/,
    /\/\*.*?\*\//,
    /xp_/i,
    /sp_/i,
  ];
  
  return sqlPatterns.some(pattern => pattern.test(input));
}

/**
 * Check if string contains XSS patterns
 * @param input - String to check
 * @returns True if suspicious patterns detected
 */
export function hasXssPattern(input: string): boolean {
  if (typeof input !== 'string') {
    return false;
  }
  
  const xssPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
  ];
  
  return xssPatterns.some(pattern => pattern.test(input));
}

/**
 * Validate file upload to prevent malicious files
 * @param filename - Uploaded file name
 * @param allowedExtensions - Array of allowed extensions
 * @returns True if file is safe
 */
export function isFileSafe(filename: string, allowedExtensions: string[]): boolean {
  if (typeof filename !== 'string') {
    return false;
  }
  
  const ext = filename.split('.').pop()?.toLowerCase();
  if (!ext) {
    return false;
  }
  
  return allowedExtensions.includes(ext);
}

/**
 * Sanitize filename to prevent directory traversal
 * @param filename - File name
 * @returns Safe filename
 */
export function sanitizeFilename(filename: string): string {
  if (typeof filename !== 'string') {
    return '';
  }
  
  return filename
    .replace(/\.\./g, '')
    .replace(/[/\\]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Rate limiting helper - check if action is allowed
 * @param key - Unique identifier (e.g., user ID, IP)
 * @param limit - Maximum attempts
 * @param windowMs - Time window in milliseconds
 * @param store - Map to store attempts
 * @returns True if action is allowed
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  store: Map<string, { count: number; resetAt: number }>
): boolean {
  const now = Date.now();
  const record = store.get(key);
  
  if (!record || now > record.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  
  if (record.count >= limit) {
    return false;
  }
  
  record.count++;
  return true;
}
