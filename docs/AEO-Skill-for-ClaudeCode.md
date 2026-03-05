# AEO (Answer Engine Optimization) Skill for Claude Code

> 適用於：Claude Code / Codex 等 AI Coding Agent
> 基於：AEO-Technical-Research-Report.md (v1.0)

## 用途
幫助工程師快速生成符合 AEO 標準的結構化資料，讓網站內容更容易被 AI 答案引擎引用。

---

## 🎯 任務類型

### 1. JSON-LD Schema 生成
- Article Schema（文章）
- HowTo Schema（教學）
- Product Schema（產品）
- Organization Schema（組織）
- Person/Author Schema（作者）
- FAQPage Schema（常見問題）

### 2. llms.txt 生成
- 網站結構化導覽
- 適合 LLM 理解的描述

### 3. FAQ Schema 生成
- 問答對生成
- 結構化標記

---

## 📋 輸入模板

### 請求格式
```
[任務類型]: <類型>
[網站/品牌名稱]: <名稱>
[URL]: <網址>
[內容類型]: <文章/產品/教學/FAQ/組織/作者>
[額外欄位]: <根據類型提供>
```

### 範例輸入

**Article Schema:**
```
[任務類型]: JSON-LD Schema
[類型]: Article
[標題]: React 19 新特性詳解
[作者]: 陳大師
[URL]: https://example.com/react-19
[發布日期]: 2026-02-25
[描述]: 完整介紹 React 19 的所有新功能...
```

**HowTo Schema:**
```
[任務類型]: JSON-LD Schema  
[類型]: HowTo
[標題]: 如何安裝 Node.js
[步驟]:
  1. 前往 Node.js 官網下載
  2. 執行安裝包
  3. 開啟終端機驗證 node -v
[總時間]: PT30M
```

**Product Schema:**
```
[任務類型]: JSON-LD Schema
[類型]: Product
[產品名稱]: Pro Wireless Mouse
[價格]: 1999
[貨幣]: TWD
[庫存]: InStock
[評分]: 4.5
[評論數]: 128
```

**llms.txt:**
```
[任務類型]: llms.txt
[專案名稱]: MyApp
[簡短摘要]: 一個現代化的...
[主要檔案]:
  - quickstart.md: 快速開始指南
  - api.md: API 參考文件
  - examples/: 範例程式碼
[可選檔案]:
  - legacy.md: 舊版文件（可跳過）
```

---

## 🔧 輸出格式

### JSON-LD Schema 輸出
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "標題",
  "author": {
    "@type": "Person",
    "name": "作者"
  },
  ...
}
</script>
```

### 驗證檢查清單
完成後自動檢查：
- [ ] JSON 語法正確
- [ ] 必要欄位齊全
- [ ] @type 與內容匹配
- [ ] 日期格式正確 (ISO 8601)
- [ ] URL 格式有效

---

## 🛠️ 常用 Schema 類型速查

| 類型 | 必要欄位 | 使用場景 |
|------|---------|---------|
| Article | headline, author, datePublished | 部落格、新聞 |
| HowTo | step[] | 教學文章 |
| Product | name, offers | 電商產品 |
| Organization | name, url | 公司官網 |
| Person | name, url | 作者頁面 |
| FAQPage | mainEntity[] | 問答頁面 |

---

## 📚 參考資源

- [Schema.org](https://schema.org)
- [Google 結構化資料文件](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data)
- [llms.txt 規範](https://llmstxt.org/)
- [Google Rich Results Test](https://search.google.com/test/rich-results)

---

## ⚠️ 常見錯誤提醒

1. **不要標記不可見內容** - Schema 必須與頁面可見內容一致
2. **避免過時資訊** - 定期更新 schema 標記
3. **正確巢狀結構** - Author 必須正確嵌套在 Article 內
4. **使用 JSON-LD** - 這是 Google 官方推薦格式
