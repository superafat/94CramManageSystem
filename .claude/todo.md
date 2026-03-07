# 2026-03-06 勞健保級距個人化

- [x] 確認現行薪資頁使用全域勞健保級距
- [x] 設計老師個別勞健保級距方案欄位與預設值
- [x] 擴充老師 CRUD 驗證與寫入欄位
- [x] 調整薪資頁依老師方案自動計算並支援手動調整
- [x] 同步財務薪資頁的級距顯示與統計
- [x] 補上兼職二代健保補充保費試算與覆核提示
- [x] 新增補充保費人工覆核後正式代扣流程
- [x] 補充老師頁的二代健保規則提示與備註引導
- [x] 新增補充保費判斷與正式扣款測試
- [x] 執行型別檢查並整理二代健保兼職規則結論

# 2026-03-06 學收繳費單工作台改寫

- [x] 新增班級總覽 API（左側班級列表）
- [x] 調整課程帳務 API 回傳當月已繳/待繳與價格記憶
- [x] 新增一鍵發布繳費單並通知家長 API
- [x] 帳務前端改為左班級右學生繳費狀態與設定介面
- [x] 支援每位學生月繳/堂繳個別設定與金額記憶
- [x] 完成前後端 typecheck 與 demo flow 對接

# 2026-03-07 四系統合體與安全 SSO

- [x] 盤點四站共用 users / tenants / auth helper 現況
- [x] 補完四系統合體與企業級 SSO 規劃文件
- [x] 收斂 manage / inclass 前端本地登入實作為 backend auth 代理
- [x] 修正 dashboard proxy 未轉發 Set-Cookie 導致的 session 漏洞
- [x] 補齊 manage / inclass 缺少的 auth google 代理 route
- [x] 執行 typecheck 驗證本輪 auth 收斂修改
- [x] 硬化 Portal middleware / proxy / admin header 為共享 cookie 優先模式
- [x] 建立中央 auth issuer 與 session store 資料模型
- [x] 導入跨子網域正式 cookie 名稱與相容遷移層
- [x] 落地第一階段 systems claim enforcement（manage / inclass / stock）
- [x] 將 manage / inclass / stock auth route 改為 session-backed，登入/refresh/logout 會寫入或撤銷 auth_sessions
- [x] 補上 manage auth 的 session 查詢、手動 revoke、tenant switch 基礎流程
- [x] 補上 platform auth 的 session 落庫與 logout revoke
- [x] 將 middleware / authMiddleware 改為直接查 user_system_entitlements，而不只信任 token systems claim
- [x] 對齊 94BOT channel binding 與中央 user identity（manage telegram login + bot bind code 寫入 user_channel_bindings）
- [ ] 在已配置且確認非生產風險的 DATABASE_URL 環境執行 auth foundation migration
