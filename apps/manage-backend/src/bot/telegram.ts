import { Bot, session, type Context, type SessionFlavor } from 'grammy'
import { InlineKeyboard, Keyboard } from 'grammy'
import { chat } from '../ai/llm'
import { ragSearch } from '../ai/rag'
import { classifyIntent } from '../ai/router'
import { logConversation } from '../ai/logger'
import { parseCommand, handleCommand } from './commands'
import { generateAttendanceChart, generateGradeTrendChart, generateRevenueChart } from './charts'
import { InputFile } from 'grammy'
import { logger } from '../utils/logger'

interface SessionData {
  branchId: string
  messageCount: number
}

type BotContext = Context & SessionFlavor<SessionData>

export function createBot(token: string, defaultBranchId: string) {
  const bot = new Bot<BotContext>(token)

  // Session middleware
  bot.use(session({
    initial: (): SessionData => ({
      branchId: defaultBranchId,
      messageCount: 0,
    }),
  }))

  // /start — Welcome
  bot.command('start', (ctx) => {
    ctx.reply(
      '👋 你好！我是蜂神榜 補習班 Ai 助手系統。' +
      '你可以直接問我任何問題：\n' +
      '📅 「數學課什麼時候上？」\n' +
      '💰 「學費多少錢？」\n' +
      '👨‍🏫 「王老師教什麼？」\n' +
      '📝 「暑假班有什麼課？」\n\n' +
      '🔧 指令列表：\n' +
      '/help - 顯示幫助\n' +
      '/search 關鍵字 - 搜尋知識庫\n' +
      '/status - 系統狀態\n\n' +
      '直接打字就好，我會自動判斷你的需求！'
    )
  })

  // /help
  bot.command('help', (ctx) => {
    ctx.reply(
      '🤖 *蜂神榜 補習班 Ai 助手系統*' +
      '📋 *可用指令：*\n' +
      '/start \\- 開始使用\n' +
      '/help \\- 顯示幫助\n' +
      '/search \\<關鍵字\\> \\- 搜尋知識庫\n' +
      '/status \\- 系統狀態\n\n' +
      '💡 *支援的問題類型：*\n' +
      '• 課表排課查詢\n' +
      '• 費用帳務問題\n' +
      '• 出缺席查詢\n' +
      '• 作業成績問題\n' +
      '• 招生報名諮詢\n' +
      '• 客訴建議反映\n' +
      '• 其他任何問題\n\n' +
      '直接輸入問題即可，AI 會自動判斷類型並回答\\!',
      { parse_mode: 'MarkdownV2' }
    )
  })

  // /status — System status
  bot.command('status', (ctx) => {
    ctx.reply(
      '📊 系統狀態\n\n' +
      `✅ AI 引擎：正常運行\n` +
      `✅ 知識庫：已啟用\n` +
      `✅ 智能路由：9 種意圖分類\n` +
      `📝 本次對話：${ctx.session.messageCount} 則訊息\n` +
      `🔗 分校 ID：${ctx.session.branchId.slice(0, 8)}...`
    )
  })

  // /search — RAG search
  bot.command('search', async (ctx) => {
    const query = ctx.match
    if (!query) {
      return ctx.reply('請輸入搜尋關鍵字，例如：/search 上課時間')
    }
    try {
      await ctx.replyWithChatAction('typing')
      const sources = await ragSearch({ query, branchId: ctx.session.branchId, topK: 5 })
      if (sources.length === 0) {
        return ctx.reply('🔍 找不到相關資料。試試其他關鍵字？')
      }
      const text = sources.map((s, i) =>
        `${i + 1}. 📄 相似度 ${(s.score * 100).toFixed(0)}%\n${s.content.slice(0, 150)}${s.content.length > 150 ? '...' : ''}`
      ).join('\n\n')
      ctx.reply(`🔍 找到 ${sources.length} 筆相關資料：\n\n${text}`)
    } catch (err) {
      logger.error({ err: err }, '[bot/search]')
      ctx.reply('❌ 搜尋時發生錯誤，請稍後再試。')
    }
  })

  // /menu — Reply keyboard (persistent bottom buttons)
  bot.command('menu', (ctx) => {
    const keyboard = new Keyboard()
      .text('📊 報告').text('📅 課表').row()
      .text('👥 學生列表').text('💰 帳單').row()
      .text('⚠️ 預警').text('🎯 招生').row()
      .resized().persistent()
    ctx.reply('📱 快捷選單已開啟！', { reply_markup: keyboard })
  })

  // /app — Open Mini App (Web App)
  bot.command('app', (ctx) => {
    const webAppUrl = process.env.MINIAPP_URL || 'https://imstudy.app'
    const keyboard = new InlineKeyboard()
      .webApp('🐝 開啟蜂神榜控制台', webAppUrl)
    ctx.reply('📱 點擊下方按鈕開啟完整控制台：', { reply_markup: keyboard })
  })

  // /report — Inline keyboard for report types
  bot.command('report', (ctx) => {
    const keyboard = new InlineKeyboard()
      .text('📊 出席率圖表', 'chart_attendance')
      .text('📈 成績趨勢', 'chart_grades').row()
      .text('💰 營收分佈', 'chart_revenue')
      .text('📋 月報文字版', 'report_text').row()
      .text('⚠️ 流失預警', 'report_churn')
    ctx.reply('📊 選擇報告類型：', { reply_markup: keyboard })
  })

  // Callback query handler (inline keyboard clicks)
  bot.on('callback_query:data', async (ctx) => {
    const data = ctx.callbackQuery.data
    const tenantId = '11111111-1111-1111-1111-111111111111'
    const branchId = defaultBranchId

    await ctx.answerCallbackQuery({ text: '生成中...' })

    try {
      switch (data) {
        case 'chart_attendance': {
          await ctx.replyWithChatAction('upload_photo')
          const buf = await generateAttendanceChart(tenantId, branchId)
          await ctx.replyWithPhoto(new InputFile(buf, 'attendance.png'), { caption: '📊 近14天出席率' })
          break
        }
        case 'chart_grades': {
          await ctx.replyWithChatAction('upload_photo')
          const buf = await generateGradeTrendChart(tenantId, branchId)
          await ctx.replyWithPhoto(new InputFile(buf, 'grades.png'), { caption: '📈 成績趨勢' })
          break
        }
        case 'chart_revenue': {
          await ctx.replyWithChatAction('upload_photo')
          const buf = await generateRevenueChart(tenantId, branchId)
          await ctx.replyWithPhoto(new InputFile(buf, 'revenue.png'), { caption: '💰 月營收分佈' })
          break
        }
        case 'report_text': {
          await ctx.replyWithChatAction('typing')
          const result = await handleCommand('branch_report', {}, { tenantId, branchId, userId: ctx.from.id.toString() })
          try { await ctx.reply(result, { parse_mode: 'Markdown' }) } catch { await ctx.reply(result) }
          break
        }
        case 'report_churn': {
          await ctx.replyWithChatAction('typing')
          const result = await handleCommand('churn_alert', {}, { tenantId, branchId, userId: ctx.from.id.toString() })
          try { await ctx.reply(result, { parse_mode: 'Markdown' }) } catch { await ctx.reply(result) }
          break
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      logger.error({ err }, `[callback]: ${msg}`)
      await ctx.reply(`❌ 生成失敗：${msg}`)
    }
  })

  // Handle all text messages — Command system + RAG-augmented AI
  bot.on('message:text', async (ctx) => {
    const query = ctx.message.text
    const userId = ctx.from.id.toString()

    // Skip if it looks like a command we missed
    if (query.startsWith('/')) return

    ctx.session.messageCount++

    try {
      // Show typing indicator
      await ctx.replyWithChatAction('typing')

      // 0. Chart requests (natural language → PNG)
      const chartMatch = query.match(/出席.*(?:圖表|圖|chart)/i) ? 'attendance'
        : query.match(/成績.*(?:圖表|趨勢|圖|chart)/i) ? 'grades'
        : query.match(/營收.*(?:圖表|圖|分佈|chart)/i) ? 'revenue'
        : null

      if (chartMatch) {
        await ctx.replyWithChatAction('upload_photo')
        const tenantId = '11111111-1111-1111-1111-111111111111'
        const buf = chartMatch === 'attendance' ? await generateAttendanceChart(tenantId, ctx.session.branchId)
          : chartMatch === 'grades' ? await generateGradeTrendChart(tenantId, ctx.session.branchId)
          : await generateRevenueChart(tenantId, ctx.session.branchId)
        const captions: Record<string, string> = { attendance: '📊 近14天出席率', grades: '📈 成績趨勢', revenue: '💰 月營收分佈' }
        await ctx.replyWithPhoto(new InputFile(buf, `${chartMatch}.png`), { caption: captions[chartMatch] })
        return
      }

      // 1. Try structured command first (Bot = Dashboard input)
      const cmd = parseCommand(query)
      if (cmd) {
        const result = await handleCommand(cmd.action, cmd.params, {
          tenantId: '11111111-1111-1111-1111-111111111111',
          branchId: ctx.session.branchId,
          userId,
        })
        try {
          await ctx.reply(result, { parse_mode: 'Markdown' })
        } catch {
          await ctx.reply(result)
        }
        logConversation(ctx.session.branchId, 'telegram', query, { answer: result, model: 'command', intent: 'general' as any, latencyMs: 0 }, userId)
        return
      }

      // 2. Fall through to AI if not a command

      // RAG search
      const sources = await ragSearch({
        query,
        branchId: ctx.session.branchId,
        topK: 3,
        threshold: 0.5,
      })

      const ragContext = sources.length > 0
        ? sources.map(s => `[來源: ${(s.metadata?.title as string) ?? '知識庫'}]\n${s.content}`).join('\n---\n')
        : undefined

      const intent = classifyIntent(query)

      const result = await chat({
        query,
        branchId: ctx.session.branchId,
        userId,
        intent,
      }, ragContext)

      // Build response with intent badge
      const intentBadge = getIntentBadge(intent)
      let response = result.answer

      // Add source indicator if RAG was used
      if (sources.length > 0) {
        response += `\n\n💡 _此回答參考了 ${sources.length} 筆知識庫資料_`
      }

      // Try Markdown first, fall back to plain text
      try {
        await ctx.reply(response, { parse_mode: 'Markdown' })
      } catch {
        await ctx.reply(result.answer)
      }

      // Log conversation
      logConversation(ctx.session.branchId, 'telegram', query, result, userId)

    } catch (err) {
      logger.error({ err }, '[bot] error')
      await ctx.reply('抱歉，處理您的問題時遇到了錯誤 😔\n請稍後再試，或直接撥打櫃台電話。')
    }
  })

  // Handle photos — acknowledge but explain
  bot.on('message:photo', (ctx) => {
    ctx.reply('📷 收到您的圖片！目前 AI 助手僅支援文字問答，圖片功能開發中。\n請用文字描述您的問題。')
  })

  // Handle stickers
  bot.on('message:sticker', (ctx) => {
    ctx.reply('😊 收到貼圖！有什麼問題想問嗎？直接打字就好～')
  })

  return bot
}

function getIntentBadge(intent: string): string {
  const badges: Record<string, string> = {
    faq: '❓',
    schedule: '📅',
    attendance: '📋',
    billing: '💰',
    report: '📊',
    enrollment: '🎓',
    complaint: '📢',
    homework: '📝',
    general: '💬',
  }
  return badges[intent] ?? '💬'
}

/** Start bot with long polling (dev) or webhook (production) */
export async function startBot(bot: Bot<BotContext>, mode: 'polling' | 'webhook' = 'polling') {
  if (mode === 'polling') {
    // Delete any existing webhook first
    await bot.api.deleteWebhook()
    logger.info('🤖 Telegram Bot starting (long polling)...')

    // Retry with backoff if 409 conflict (another instance still polling)
    const maxRetries = 5
    for (let i = 0; i < maxRetries; i++) {
      try {
        await bot.start({
          onStart: (info) => logger.info(`🤖 Telegram Bot @${info.username} is running!`),
        })
        return // success
      } catch (err) {
        if (err instanceof Error && (err as any).error_code === 409 && i < maxRetries - 1) {
          const delay = (i + 1) * 3000
          logger.warn(`⚠️ Bot polling conflict (409), retrying in ${delay/1000}s... (${i+1}/${maxRetries})`)
          await new Promise(r => setTimeout(r, delay))
        } else {
          throw err
        }
      }
    }
  }
}
