# Outlook AI 2.0 - 完整功能規劃

## 🎯 目前狀態 vs 需要完成的功能

### ✅ 已完成（視覺化界面）
- 寄件人大頭照視覺化
- 三狀態管理系統
- AI 自動筆記顯示
- 拖拽互動
- 統計面板

### 🔧 需要實作（真實郵件功能）

#### 1. 郵件收發核心功能

**收信功能：**
```javascript
// 自動同步收件匣
async function syncInbox() {
    const response = await fetch('/api/email/list');
    const emails = await response.json();
    displayEmails(emails);
}

// 定時自動刷新（每 5 分鐘）
setInterval(syncInbox, 5 * 60 * 1000);
```

**發信功能：**
```javascript
// 撰寫新郵件
function composeEmail() {
    showComposeDialog({
        to: '',
        subject: '',
        body: ''
    });
}

// 發送郵件
async function sendEmail(to, subject, body, attachments) {
    const formData = new FormData();
    formData.append('to', to);
    formData.append('subject', subject);
    formData.append('body', body);
    attachments.forEach(file => formData.append('attachments', file));

    const response = await fetch('/api/email/send', {
        method: 'POST',
        body: formData
    });
    return response.json();
}
```

**回覆功能：**
```javascript
// 回覆郵件
function replyEmail(originalEmail) {
    showComposeDialog({
        to: originalEmail.from.address,
        subject: 'Re: ' + originalEmail.subject,
        body: '\n\n--- 原始郵件 ---\n' + originalEmail.text
    });
}

// 全部回覆
function replyAll(originalEmail) {
    const recipients = [originalEmail.from, ...originalEmail.cc].map(r => r.address).join(',');
    showComposeDialog({
        to: recipients,
        subject: 'Re: ' + originalEmail.subject,
        body: '\n\n--- 原始郵件 ---\n' + originalEmail.text
    });
}
```

**轉發功能：**
```javascript
function forwardEmail(originalEmail) {
    showComposeDialog({
        to: '',
        subject: 'Fwd: ' + originalEmail.subject,
        body: '\n\n--- 轉發郵件 ---\n' +
              '從: ' + originalEmail.from.name + '\n' +
              '日期: ' + originalEmail.date + '\n' +
              '主旨: ' + originalEmail.subject + '\n\n' +
              originalEmail.text,
        attachments: originalEmail.attachments
    });
}
```

#### 2. 郵件管理功能

**標記已讀/未讀：**
```javascript
async function markAsRead(emailId) {
    await fetch(`/api/email/${emailId}/read`, { method: 'POST' });
    updateEmailUI(emailId, { isRead: true });
}

async function markAsUnread(emailId) {
    await fetch(`/api/email/${emailId}/unread`, { method: 'POST' });
    updateEmailUI(emailId, { isRead: false });
}
```

**刪除郵件：**
```javascript
async function deleteEmail(emailId) {
    if (confirm('確定要刪除這封郵件嗎？')) {
        await fetch(`/api/email/${emailId}`, { method: 'DELETE' });
        removeEmailFromUI(emailId);
    }
}
```

**加星號：**
```javascript
async function toggleStar(emailId) {
    const email = getEmail(emailId);
    const newState = !email.starred;
    await fetch(`/api/email/${emailId}/star`, {
        method: 'POST',
        body: JSON.stringify({ starred: newState })
    });
    updateEmailUI(emailId, { starred: newState });
}
```

#### 3. 附件處理

**上傳附件：**
```javascript
function handleFileUpload(files) {
    const attachmentList = [];
    for (let file of files) {
        attachmentList.push({
            name: file.name,
            size: file.size,
            type: file.type,
            file: file
        });
    }
    displayAttachments(attachmentList);
}
```

**下載附件：**
```javascript
async function downloadAttachment(emailId, attachmentId, filename) {
    const response = await fetch(`/api/email/${emailId}/attachment/${attachmentId}`);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
}
```

#### 4. 帳號連接

**Gmail 連接：**
```javascript
async function connectGmail() {
    const email = prompt('請輸入 Gmail 帳號：');
    const password = prompt('請輸入應用程式專用密碼：');

    const response = await fetch('/api/auth/gmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: email,
            password: password
        })
    });

    if (response.ok) {
        alert('Gmail 帳號連接成功！');
        syncInbox();
    }
}
```

**Outlook 連接：**
```javascript
async function connectOutlook() {
    // 使用 Microsoft OAuth 2.0
    window.location.href = '/api/auth/outlook/authorize';
}
```

#### 5. 搜尋功能

**全文搜尋：**
```javascript
async function searchEmails(query) {
    const response = await fetch(`/api/email/search?q=${encodeURIComponent(query)}`);
    const results = await response.json();
    displaySearchResults(results);
}

// 進階搜尋
async function advancedSearch(filters) {
    const params = new URLSearchParams({
        from: filters.from || '',
        to: filters.to || '',
        subject: filters.subject || '',
        hasAttachment: filters.hasAttachment || false,
        dateFrom: filters.dateFrom || '',
        dateTo: filters.dateTo || ''
    });

    const response = await fetch(`/api/email/search?${params}`);
    const results = await response.json();
    displaySearchResults(results);
}
```

---

## 📋 實作步驟

### Phase 1：撰寫郵件 UI（今天完成）
- 新增「撰寫郵件」彈窗
- 收件人、主旨、內容輸入框
- 附件上傳區
- 發送按鈕

### Phase 2：整合後端 API（今天完成）
- 連接現有的 email.service.js
- 實作所有 API 調用
- 錯誤處理

### Phase 3：帳號設置（今天完成）
- 新增設置頁面
- Gmail/Outlook 帳號連接
- 測試連接功能

### Phase 4：進階功能（明天）
- 郵件分類規則
- 自動回覆
- 郵件範本
- 批量操作

---

## 🚀 立即開始實作

現在我會創建：
1. **完整功能版 HTML**（包含所有 UI 和 API 調用）
2. **帳號設置頁面**（連接 Gmail/Outlook）
3. **撰寫郵件彈窗**（完整的郵件編輯器）

您想先看哪一個？還是我一次做完全部？
