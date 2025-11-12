# 📧 Outlook AI 2.0 - 智能郵件管理系統

> 整合 OpenAI GPT-4o 的智能郵件管理系統 - 寄件人視覺化 + 三狀態拖拽 + AI 深度分析

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-412991.svg)

完整的郵件管理系統，支持真實郵件操作、OpenAI AI 自動分析、智能回覆和自動跟催。

## 🚀 快速開始

### 1. 安裝依賴

```bash
npm install
```

### 2. 配置郵件服務

複製 `.env.example` 為 `.env`：

```bash
cp .env.example .env
```

### 3. 選擇郵件服務類型

編輯 `.env` 文件，選擇以下其中一種：

#### 選項 A: Gmail（推薦 - 最簡單）

```env
EMAIL_SERVICE_TYPE=gmail

GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password
```

**獲取 Gmail 應用密碼：**
1. 前往 [Google 帳戶](https://myaccount.google.com/)
2. 安全性 → 兩步驟驗證（必須啟用）
3. 應用程式密碼 → 生成密碼
4. 複製密碼到 `.env`

#### 選項 B: Outlook / Hotmail

```env
EMAIL_SERVICE_TYPE=outlook

OUTLOOK_USER=your-email@outlook.com
OUTLOOK_PASSWORD=your-password
```

#### 選項 C: 其他 IMAP/SMTP

```env
EMAIL_SERVICE_TYPE=imap

EMAIL_USER=your-email@example.com
EMAIL_PASSWORD=your-password

IMAP_HOST=imap.example.com
IMAP_PORT=993

SMTP_HOST=smtp.example.com
SMTP_PORT=587
```

### 4. 啟動服務

```bash
# 開發模式（自動重啟）
npm run dev

# 或生產模式
npm start
```

### 5. 打開瀏覽器

前往 http://localhost:3000

郵件會自動載入！✨

## 📋 核心功能

### ✅ 真實郵件操作
- 讀取收件箱郵件
- 發送郵件
- 搜索郵件
- 標記已讀/未讀

### 🤖 AI 功能
- **自動分析郵件**：提取關鍵點、計算優先級
- **情感分析**：識別客戶情緒（積極、消極、緊急）
- **AI 生成回覆**：根據郵件內容自動生成專業回覆
- **商機評估**：預估訂單價值和客戶意向度

### 🎯 智能管理
- 寄件人大頭像面板（拖放標記完成）
- 郵件追蹤和狀態管理
- 自動跟催系統

## 🔧 故障排除

### 連接失敗？

1. **檢查郵件密碼**：
   - Gmail 必須使用應用專用密碼，不是您的登錄密碼
   - Outlook 使用正常密碼

2. **檢查防火牆**：
   - 確保端口 993 (IMAP) 和 587 (SMTP) 未被阻擋

3. **檢查後端運行**：
   ```bash
   # 查看後端日誌
   npm start
   # 應該看到 "Server: http://localhost:3000"
   ```

4. **測試連接**：
   - 前往 http://localhost:3000/api/health
   - 應該看到 `{"status":"ok"}`

### 沒有郵件顯示？

- 打開瀏覽器開發者工具（F12）
- 查看 Console 標籤
- 檢查錯誤信息

## 📚 API 文檔

### 郵件 API

```bash
# 獲取郵件列表
GET /api/email/list?limit=50&offset=0&unreadOnly=false

# 獲取單個郵件
GET /api/email/:emailId

# 發送郵件
POST /api/email/send
{
  "to": "recipient@example.com",
  "subject": "Hello",
  "text": "Email body",
  "html": "<p>Email body</p>"
}

# 搜索郵件
GET /api/email/search/:query

# 標記為已讀
POST /api/email/:emailId/read
```

### AI API

```bash
# 分析郵件
POST /api/ai/analyze
{
  "emailContent": "...",
  "subject": "...",
  "from": "..."
}

# 生成回覆
POST /api/ai/generate-reply
{
  "emailContent": "...",
  "context": {}
}
```

## 🎨 自訂設定

### 更改端口

編輯 `.env`：
```env
PORT=8080
```

### 啟用 AI 增強（可選）

如果您有 OpenAI API Key：

```env
ENABLE_AI_ANALYSIS=true
OPENAI_API_KEY=your-openai-key
OPENAI_MODEL=gpt-4
```

這將使用 GPT-4 進行更深入的郵件分析。

## 💡 使用技巧

1. **拖放操作**：處理完郵件後，將聯絡人卡片拖到「已完成」區域
2. **AI 生成回覆**：點擊郵件後，點擊「AI 生成回覆草稿」按鈕
3. **搜索郵件**：使用頂部搜索框快速找到郵件
4. **查看 AI 分析**：每封郵件都會自動顯示 AI 分析結果

## 🔒 安全性

- 所有密碼都儲存在 `.env` 文件中（不會提交到 Git）
- 使用 TLS/SSL 加密連接
- 建議使用應用專用密碼，不是主密碼

## 📝 授權

MIT License

---

## ⚡ 快速測試（不需要真實郵件）

如果您只想測試介面，不連接真實郵件：

1. 打開瀏覽器
2. 前往 http://localhost:3000
3. 系統會顯示模擬數據

## 🆘 需要幫助？

- 查看 `.env.example` 中的詳細配置說明
- 檢查後端日誌是否有錯誤信息
- 確保您的郵件服務允許 IMAP/SMTP 訪問

---

**開發者**: Amber Hu
**版本**: 1.0.0
