/**
 * Telegram @mention parser for group messages
 * Extracts the actual question from messages that @mention the bot
 */

export interface MentionParseResult {
  isMentioned: boolean;
  isCommand: boolean;
  cleanText: string;
}

/**
 * Parse a message to check if the bot is mentioned or a command is directed at it
 * @param text - Raw message text
 * @param botUsername - Bot's @username (without @)
 */
export function parseMention(text: string, botUsername: string): MentionParseResult {
  const trimmed = text.trim();
  const username = botUsername.replace(/^@/, '');

  // Check for /command@botusername pattern
  const cmdMatch = trimmed.match(new RegExp(`^(/\\w+)@${username}\\b(.*)`, 'i'));
  if (cmdMatch) {
    return {
      isMentioned: true,
      isCommand: true,
      cleanText: (cmdMatch[1] + cmdMatch[2]).trim(),
    };
  }

  // Check for plain /command (in groups, Telegram may send without @username)
  if (trimmed.startsWith('/')) {
    return {
      isMentioned: true,
      isCommand: true,
      cleanText: trimmed,
    };
  }

  // Check for @botusername mention anywhere in text
  const mentionRegex = new RegExp(`@${username}\\b`, 'gi');
  if (mentionRegex.test(trimmed)) {
    const cleaned = trimmed.replace(mentionRegex, '').trim();
    return {
      isMentioned: true,
      isCommand: false,
      cleanText: cleaned || '你好',
    };
  }

  return {
    isMentioned: false,
    isCommand: false,
    cleanText: trimmed,
  };
}
