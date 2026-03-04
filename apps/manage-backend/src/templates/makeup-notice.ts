/**
 * 補課通知書 HTML 模板
 * 回傳完整 HTML 文件，帶 @media print 樣式，供瀏覽器列印為 PDF
 */

export interface MakeupNoticeData {
  studentName: string
  originalDate: string
  originalCourseName: string
  makeupDate: string
  makeupTime: string
  makeupEndTime?: string
  teacherName?: string
  room?: string
  notes?: string
}

/** 西元年轉民國年字串，例如 "2026-03-05" → "115 年 3 月 5 日" */
function toMinguoDate(dateStr: string): string {
  const year = parseInt(dateStr.substring(0, 4), 10) - 1911
  const month = parseInt(dateStr.substring(5, 7), 10)
  const day = parseInt(dateStr.substring(8, 10), 10)
  return `${year} 年 ${month} 月 ${day} 日`
}

export function generateMakeupNoticeHTML(data: MakeupNoticeData): string {
  const originalDateDisplay = toMinguoDate(data.originalDate)
  const makeupDateDisplay = toMinguoDate(data.makeupDate)

  const timeRange = data.makeupEndTime
    ? `${data.makeupTime} ~ ${data.makeupEndTime}`
    : data.makeupTime

  const rows: Array<[string, string]> = [
    ['學生姓名', data.studentName],
    ['原課程', data.originalCourseName || '-'],
    ['原上課日期', originalDateDisplay],
    ['補課日期', makeupDateDisplay],
    ['補課時間', timeRange],
  ]

  if (data.teacherName) {
    rows.push(['授課老師', data.teacherName])
  }
  if (data.room) {
    rows.push(['教室', data.room])
  }
  if (data.notes) {
    rows.push(['備註', data.notes])
  }

  const tableRows = rows
    .map(
      ([label, value]) => `
        <tr>
          <th>${label}</th>
          <td>${value}</td>
        </tr>`
    )
    .join('')

  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>補課通知書 - ${data.studentName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: "Noto Sans TC", "Microsoft JhengHei", "PingFang TC", sans-serif;
      background: #f5f5f0;
      color: #333;
      display: flex;
      justify-content: center;
      padding: 20px;
    }

    .page {
      width: 210mm;
      min-height: 297mm;
      background: #fff;
      padding: 60px 50px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
    }

    .header {
      text-align: center;
      margin-bottom: 40px;
    }

    .header h1 {
      font-size: 28px;
      color: #8FA895;
      letter-spacing: 6px;
      margin-bottom: 8px;
    }

    .header .divider {
      width: 60px;
      height: 3px;
      background: #8FA895;
      margin: 0 auto;
    }

    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin: 30px 0 40px;
    }

    .info-table th,
    .info-table td {
      padding: 14px 18px;
      text-align: left;
      font-size: 16px;
      border-bottom: 1px solid #e8e4df;
    }

    .info-table th {
      width: 130px;
      color: #8FA895;
      font-weight: 600;
      background: #f9f9f6;
    }

    .info-table td {
      color: #444;
    }

    .notice-box {
      background: #fdf6f0;
      border-left: 4px solid #C4956A;
      padding: 16px 20px;
      margin: 30px 0;
      font-size: 14px;
      color: #6b5a4e;
      line-height: 1.8;
    }

    .footer {
      text-align: right;
      margin-top: 60px;
      font-size: 16px;
      color: #666;
    }

    .print-btn {
      display: block;
      margin: 20px auto 0;
      padding: 10px 32px;
      background: #8FA895;
      color: #fff;
      border: none;
      border-radius: 6px;
      font-size: 16px;
      cursor: pointer;
    }

    .print-btn:hover {
      background: #7a9580;
    }

    @media print {
      body {
        background: #fff;
        padding: 0;
      }

      .page {
        box-shadow: none;
        padding: 40px 30px;
        min-height: auto;
      }

      .print-btn {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <h1>補課通知書</h1>
      <div class="divider"></div>
    </div>

    <table class="info-table">
      ${tableRows}
    </table>

    <div class="notice-box">
      請同學依照上述時間準時到班上課。如有任何問題，請提前與補習班聯繫。
    </div>

    <div class="footer">
      94 補習班 敬上
    </div>
  </div>

  <button class="print-btn" onclick="window.print()">列印 / 儲存為 PDF</button>
</body>
</html>`
}
