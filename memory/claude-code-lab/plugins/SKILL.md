# Ralph Wiggum - Claude Code 官方迭代插件

## 影片來源
- YouTube: Anthropic 官方 Ralph Wiggum 插件深度測試
- 影片描述：讓 Claude Code 變身全自動開發機器

## 什麼是 Ralph Wiggum？

Ralph Wiggum 是 Anthropic 官方發布的 Claude Code 插件，命名來自《辛普森家族》中的角色 Ralph Wiggum，象徵著「即使不斷犯錯也會執著於嘗試直到成功的孩子般的堅持」。

## 核心機制

```
Claude Code 寫代碼 → Ralph Wiggum 攔截退出 → 再次餵回任務 → 檢查是否達標
                                                                     ↓
                                                             沒達標→繼續迭代
                                                                     ↓
                                                             達標→停止
```

### 關鍵特點
1. **外部控制回路**：把一次性回答變成可控的持續迭代
2. **回合制工程節奏**：修改→驗證→反饋→再修改→再驗證
3. **利用上一輪反饋持續糾錯**

## 適合場景

- ✅ Bug 修復
- ✅ 補測試
- ✅ 依賴遷移
- ✅ 重構
- ❌ 簡單一次性任務（浪費）

## 安裝步驟

```bash
# 1. 添加插件市場
/plugin marketplace add https://github.com/anthropics/anthropic-quickstarts

# 2. 安裝 Ralph Wiggum
/plugin install ralph

# 3. 啟動循環
/ralph --max 20 --promise "DONE"
```

## 使用方式

```bash
# 基本用法
/ralph [max-iterations] [completion-promise]

# 範例：20 輪迭代
/ralph 20 "DONE"
```

### 參數說明
| 參數 | 說明 | 範例 |
|------|------|------|
| max-iterations | 最大迭代次數 | 20 |
| completion-promise | 完成承諾 | "DONE" |

## 實測效果

### 測試案例：iOS 背單字應用

**迭代前（Bug 狀態）**：
- 字體顯示不清晰
- 單詞卡片重疊
- 功能不完善

**迭代 20 輪後**：
- UI 精美流暢
- 每日學習目標設定
- 多元練習題型
- 詞庫管理
- 發音播放
- 錯誤複習功能
- 深色模式切換

### 耗時
- 20 輪迭代 ≈ 2 小時
- 全程無需人工干預

## 指令速查

```bash
# 顯示幫助
/ralph --help

# 取消循環
/ralph --cancel

# 啟動循環
/ralph [次數] [完成詞]
```

## 與 OpenClaw 整合

Ralph Wiggum 適合與 OpenClaw 結合作為幕後開發引擎：
- OpenClaw 負責規劃與決策
- Ralph 負責持續迭代執行

## 官方資源

- GitHub: anthropics/anthropic-quickstarts
- 相關插件參考：oh-my-claudecode
