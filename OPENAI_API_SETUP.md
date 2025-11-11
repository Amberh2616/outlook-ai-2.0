# OpenAI API 整合設定指南

## 📋 目錄

1. [概述](#概述)
2. [取得 OpenAI API Key](#取得-openai-api-key)
3. [環境配置](#環境配置)
4. [API 功能說明](#api-功能說明)
5. [使用方式](#使用方式)
6. [費用預估](#費用預估)
7. [常見問題](#常見問題)

---

## 概述

Outlook AI 2.0 整合了 OpenAI GPT-4o 模型，提供以下 AI 功能：

✅ **郵件智能分析**
- 自動分析郵件內容和商業價值
- 情感分析和優先級判斷
- 客戶意圖識別

✅ **AI 回覆建議**
- 根據郵件內容生成專業回覆
- 支援多種語氣和風格
- 中文商業郵件優化

✅ **待辦事項提取**
- 從郵件中自動提取行動項目
- 智能設定優先級和截止日期
- 任務分類和建議

✅ **批次處理**
- 支援批次分析多封郵件
- 自動限流避免 API 超額
- 效能優化和錯誤處理

---

## 取得 OpenAI API Key

### 步驟 1: 註冊 OpenAI 帳號

1. 前往 [OpenAI Platform](https://platform.openai.com/)
2. 點擊右上角 **Sign up** 註冊
3. 使用 Google 帳號或 Email 註冊
4. 完成 Email 驗證

### 步驟 2: 取得 API Key

1. 登入後前往 [API Keys 頁面](https://platform.openai.com/api-keys)
2. 點擊 **Create new secret key**
3. 輸入 Key 名稱（例如：`Outlook-AI-Production`）
4. **重要：立即複製 API Key！** 離開頁面後無法再次查看
5. 妥善保管 API Key，不要分享給他人

### 步驟 3: 設定付款方式

1. 前往 [Billing Settings](https://platform.openai.com/account/billing/overview)
2. 點擊 **Add payment method**
3. 輸入信用卡資訊
4. 設定使用額度限制（建議從 $10-20 開始）

---

## 環境配置

### 方法 1: 使用 .env 檔案（推薦）

1. 編輯專案根目錄的 `.env` 檔案：

```bash
# 啟用 AI 分析功能
ENABLE_AI_ANALYSIS=true

# OpenAI API 配置
OPENAI_API_KEY=sk-your-actual-api-key-here
OPENAI_MODEL=gpt-4o
```

2. 將 `sk-your-actual-api-key-here` 替換為你的真實 API Key

3. 儲存檔案並重啟伺服器：

```bash
npm start
```

### 方法 2: 環境變數設定

**Linux / macOS:**
```bash
export ENABLE_AI_ANALYSIS=true
export OPENAI_API_KEY=sk-your-actual-api-key-here
export OPENAI_MODEL=gpt-4o
npm start
```

**Windows (CMD):**
```cmd
set ENABLE_AI_ANALYSIS=true
set OPENAI_API_KEY=sk-your-actual-api-key-here
set OPENAI_MODEL=gpt-4o
npm start
```

**Windows (PowerShell):**
```powershell
$env:ENABLE_AI_ANALYSIS="true"
$env:OPENAI_API_KEY="sk-your-actual-api-key-here"
$env:OPENAI_MODEL="gpt-4o"
npm start
```

---

## API 功能說明

### 1. 郵件分析 API

**端點:** `POST /api/ai/analyze`

**請求格式:**
```json
{
  "emailContent": "郵件正文內容",
  "subject": "郵件主旨",
  "from": "sender@example.com"
}
```

**回應範例:**
```json
{
  "success": true,
  "analysis": {
    "priority": "high",
    "sentiment": "positive",
    "urgency": "high",
    "category": "sales",
    "opportunityValue": "$50K-$100K",
    "commercialIntent": 85,
    "keyInsights": [
      "客戶表達明確採購意願",
      "預算範圍合理且明確",
      "時間緊迫需立即回應"
    ],
    "nextSteps": [
      "48小時內回覆報價",
      "準備產品規格書",
      "安排線上會議"
    ],
    "aiEnhanced": true,
    "apiCost": 0.004521
  }
}
```

### 2. 生成回覆 API

**端點:** `POST /api/ai/generate-reply`

**請求格式:**
```json
{
  "emailContent": "原始郵件內容",
  "context": {
    "originalSubject": "關於產品報價",
    "from": "客戶名稱",
    "additionalContext": "客戶是VIP，預算充足"
  }
}
```

**回應範例:**
```json
{
  "success": true,
  "reply": {
    "content": "王先生您好，\n\n感謝您對我們產品的關注...",
    "aiGenerated": true,
    "suggestedSubject": "Re: 關於產品報價",
    "apiCost": 0.003215
  }
}
```

### 3. 提取待辦事項 API

**端點:** `POST /api/ai/extract-todos`

**請求格式:**
```json
{
  "emailContent": "郵件內容",
  "emailSubject": "郵件主旨"
}
```

**回應範例:**
```json
{
  "success": true,
  "todos": [
    {
      "text": "準備產品規格書",
      "priority": "high",
      "deadline": "11/15",
      "category": "preparation"
    },
    {
      "text": "發送報價單給客戶",
      "priority": "high",
      "deadline": "11/16",
      "category": "reply"
    }
  ]
}
```

### 4. 批次分析 API

**端點:** `POST /api/ai/batch-analyze`

**請求格式:**
```json
{
  "emails": [
    {
      "content": "郵件1內容",
      "subject": "主旨1",
      "from": "sender1@example.com"
    },
    {
      "content": "郵件2內容",
      "subject": "主旨2",
      "from": "sender2@example.com"
    }
  ]
}
```

**限制:** 單次最多 20 封郵件

### 5. 取得 AI 服務狀態

**端點:** `GET /api/ai/status`

**回應範例:**
```json
{
  "success": true,
  "status": {
    "enabled": true,
    "hasOpenAI": true,
    "model": "gpt-4o",
    "features": {
      "emailAnalysis": true,
      "replyGeneration": true,
      "todoExtraction": true,
      "batchProcessing": true,
      "aiEnhancement": true
    }
  }
}
```

---

## 使用方式

### 前端整合範例

```javascript
// 分析單封郵件
async function analyzeEmail(email) {
    try {
        const response = await fetch('http://localhost:3000/api/ai/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                emailContent: email.text,
                subject: email.subject,
                from: email.from.address
            })
        });

        const result = await response.json();

        if (result.success) {
            console.log('AI 分析結果:', result.analysis);
            return result.analysis;
        }
    } catch (error) {
        console.error('AI 分析失敗:', error);
    }
}

// 生成回覆建議
async function generateReply(email) {
    try {
        const response = await fetch('http://localhost:3000/api/ai/generate-reply', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                emailContent: email.text,
                context: {
                    originalSubject: email.subject,
                    from: email.from.name
                }
            })
        });

        const result = await response.json();

        if (result.success) {
            console.log('建議回覆:', result.reply.content);
            return result.reply;
        }
    } catch (error) {
        console.error('生成回覆失敗:', error);
    }
}

// 檢查 AI 服務狀態
async function checkAIStatus() {
    try {
        const response = await fetch('http://localhost:3000/api/ai/status');
        const result = await response.json();

        console.log('AI 服務狀態:', result.status);
        return result.status;
    } catch (error) {
        console.error('無法取得 AI 狀態:', error);
    }
}
```

### 郵件服務整合

在獲取郵件時自動進行 AI 分析：

```javascript
// 透過 Email Service 獲取郵件並分析
const emails = await emailService.fetchEmails({
    limit: 10,
    includeAIAnalysis: true  // 啟用 AI 分析
});

// 每封郵件會包含 aiAnalysis 欄位
emails.forEach(email => {
    console.log('主旨:', email.subject);
    console.log('優先級:', email.aiAnalysis?.priority);
    console.log('商業價值:', email.aiAnalysis?.opportunityValue);
});
```

---

## 費用預估

### GPT-4o 定價 (2024)

| 項目 | 費用 |
|------|------|
| Input tokens | $0.0025 / 1K tokens |
| Output tokens | $0.010 / 1K tokens |

### 實際使用成本

**單封郵件分析:**
- 平均 tokens 使用：約 600-1000 tokens
- 預估成本：**$0.003 - 0.006 / 封**

**單封回覆生成:**
- 平均 tokens 使用：約 400-600 tokens
- 預估成本：**$0.002 - 0.004 / 封**

**月度成本預估:**

| 使用量 | 功能 | 月成本估算 |
|--------|------|-----------|
| 50 封/天 | 僅分析 | $7.5 - $9 |
| 50 封/天 | 分析 + 回覆建議 | $12 - $15 |
| 200 封/天 | 僅分析 | $30 - $36 |
| 200 封/天 | 分析 + 回覆建議 | $48 - $60 |

### 成本控制建議

1. **設定使用額度限制**
   - 在 OpenAI 後台設定月度限額
   - 建議初期設定 $10-20 限額

2. **選擇性啟用 AI**
   - 僅對重要郵件使用 AI 分析
   - 根據寄件人或關鍵字過濾

3. **使用批次處理**
   - 批次處理可減少 API 呼叫次數
   - 系統已內建限流機制

4. **監控使用量**
   - 定期檢查 OpenAI 後台使用統計
   - 查看每次 API 回應中的 `apiCost` 欄位

---

## 常見問題

### Q1: API Key 應該如何保管？

**A:**
- ✅ 儲存在 `.env` 檔案中（不要提交到 Git）
- ✅ 使用環境變數
- ✅ 定期更換 API Key
- ❌ 不要寫在程式碼中
- ❌ 不要分享給他人
- ❌ 不要提交到 GitHub

### Q2: 如何知道 AI 功能是否正常運作？

**A:**
1. 啟動伺服器後查看 console 輸出：
   ```
   ✅ OpenAI AI Service initialized with API key
   ```

2. 呼叫狀態 API：
   ```bash
   curl http://localhost:3000/api/ai/status
   ```

3. 查看回應中的 `hasOpenAI: true`

### Q3: 如果 API 配額用完會怎樣？

**A:**
- AI 功能會自動降級為基礎版本（不使用 OpenAI）
- 仍會提供關鍵字分析、情感分析等基礎功能
- 不會影響郵件收發等核心功能
- Console 會顯示錯誤訊息

### Q4: 可以使用其他 GPT 模型嗎？

**A:**
可以！在 `.env` 中修改：

```bash
# 使用 GPT-4
OPENAI_MODEL=gpt-4

# 使用 GPT-3.5 Turbo (更便宜)
OPENAI_MODEL=gpt-3.5-turbo

# 使用 GPT-4o (推薦，平衡性能和成本)
OPENAI_MODEL=gpt-4o
```

### Q5: 如何暫時關閉 AI 功能？

**A:**
在 `.env` 中設定：

```bash
ENABLE_AI_ANALYSIS=false
```

或註解掉 `OPENAI_API_KEY`：

```bash
# OPENAI_API_KEY=sk-...
```

### Q6: AI 分析需要多久時間？

**A:**
- 單封郵件：約 1-3 秒
- 批次 5 封：約 3-6 秒
- 批次 20 封：約 20-30 秒

系統已內建限流，每 5 封郵件之間會休息 1 秒，避免 API rate limit。

### Q7: 可以自訂 AI 提示詞（Prompt）嗎？

**A:**
可以！修改 `/server/services/ai.service.js` 中的 prompt 內容：

```javascript
// 在 enhanceWithAI 方法中
const prompt = `你是專業的商業郵件分析助手...`; // 修改這裡
```

### Q8: 如何處理多語言郵件？

**A:**
GPT-4o 支援多語言，系統會自動偵測郵件語言。如需指定語言，可在生成回覆時加入 context：

```javascript
{
  "emailContent": "...",
  "context": {
    "language": "en-US"  // 或 "zh-TW", "ja-JP" 等
  }
}
```

---

## 安全性建議

### 🔒 保護 API Key

1. **環境變數隔離**
   ```bash
   # .env 檔案應加入 .gitignore
   echo ".env" >> .gitignore
   ```

2. **使用密鑰管理服務**
   - AWS Secrets Manager
   - Azure Key Vault
   - HashiCorp Vault

3. **限制 API Key 權限**
   - 在 OpenAI 後台設定使用限額
   - 設定 IP 白名單（如果可用）

### 🛡️ 資料隱私

1. **不要將敏感資訊發送到 API**
   - 信用卡號碼
   - 密碼
   - 個人身份證號
   - 醫療資訊

2. **遵守資料保護法規**
   - GDPR（歐盟）
   - CCPA（加州）
   - PDPA（台灣）

3. **通知使用者**
   - 明確告知使用 AI 分析
   - 提供退出選項

---

## 技術支援

### 相關連結

- [OpenAI API 文件](https://platform.openai.com/docs)
- [OpenAI Pricing](https://openai.com/pricing)
- [Usage Dashboard](https://platform.openai.com/usage)
- [API Status](https://status.openai.com/)

### 錯誤排查

**問題：啟動時顯示 "OpenAI AI Service running in basic mode"**

解決方式：
1. 檢查 `.env` 中的 `ENABLE_AI_ANALYSIS=true`
2. 檢查 `OPENAI_API_KEY` 是否正確設定
3. 確認 API Key 以 `sk-` 開頭

**問題：API 回應 401 Unauthorized**

解決方式：
1. 確認 API Key 正確無誤
2. 檢查 API Key 是否已過期
3. 確認帳號是否已設定付款方式

**問題：API 回應 429 Rate Limit**

解決方式：
1. 降低並發請求數量
2. 增加批次間的休息時間
3. 升級 OpenAI 帳號方案

---

## 更新日誌

### v1.0.0 (2024-11-11)
- ✅ 整合 OpenAI GPT-4o
- ✅ 郵件智能分析
- ✅ AI 回覆生成
- ✅ 待辦事項提取
- ✅ 批次處理功能
- ✅ 成本追蹤

---

**需要幫助？**

請參閱 [GitHub Issues](https://github.com/your-repo/issues) 或聯繫技術支援。
