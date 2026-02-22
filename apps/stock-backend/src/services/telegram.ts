import TelegramBot from 'node-telegram-bot-api';

type SendTelegramNotificationInput = {
  botToken: string;
  chatId: string;
  message: string;
  parseMode?: TelegramBot.ParseMode;
};

export async function sendNotification(input: SendTelegramNotificationInput) {
  const maxAttempts = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const bot = new TelegramBot(input.botToken, { polling: false });
      return await bot.sendMessage(input.chatId, input.message, {
        parse_mode: input.parseMode || 'Markdown',
      });
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 500));
      }
    }
  }

  throw lastError;
}
