// ===================================
// Outlook AI - 智能郵件管理系統
// JavaScript 交互功能（連接真實郵件 API）
// ===================================

// API 配置
const API_BASE_URL = 'http://localhost:3000/api';

// 應用狀態管理
const AppState = {
    currentView: 'inbox',
    selectedEmail: null,
    currentAssistantPanel: 'merchandising',
    contactsFilter: 'pending',
    completedContacts: [],
    realEmails: [], // 真實郵件數據
    emailCache: new Map(), // 郵件快取

    // AI 筆記（將從後端獲取）
    aiNotes: new Map()
};

// ===================================
// API 調用函數
// ===================================

// 獲取郵件列表
async function fetchEmailsFromServer(options = {}) {
    try {
        const params = new URLSearchParams({
            folder: options.folder || 'INBOX',
            limit: options.limit || 50,
            offset: options.offset || 0,
            unreadOnly: options.unreadOnly || false
        });

        const response = await fetch(`${API_BASE_URL}/email/list?${params}`);
        const data = await response.json();

        if (data.success) {
            AppState.realEmails = data.emails;
            displayRealEmails(data.emails);
            updateContactsFromEmails(data.emails);
            return data.emails;
        } else {
            throw new Error(data.error || 'Failed to fetch emails');
        }
    } catch (error) {
        console.error('Fetch emails error:', error);
        showNotification('無法載入郵件：' + error.message, 'error');
        return [];
    }
}

// 獲取單個郵件
async function fetchEmailById(emailId) {
    try {
        // 檢查快取
        if (AppState.emailCache.has(emailId)) {
            return AppState.emailCache.get(emailId);
        }

        const response = await fetch(`${API_BASE_URL}/email/${emailId}`);
        const data = await response.json();

        if (data.success) {
            // 快取郵件
            AppState.emailCache.set(emailId, data.email);

            // 獲取 AI 分析
            await analyzeEmailWithAI(data.email);

            return data.email;
        } else {
            throw new Error(data.error || 'Failed to fetch email');
        }
    } catch (error) {
        console.error('Fetch email error:', error);
        showNotification('無法載入郵件：' + error.message, 'error');
        return null;
    }
}

// 發送郵件
async function sendEmailToServer(emailData) {
    try {
        const response = await fetch(`${API_BASE_URL}/email/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(emailData)
        });

        const data = await response.json();

        if (data.success) {
            showNotification('郵件已成功發送！', 'success');
            return data.result;
        } else {
            throw new Error(data.error || 'Failed to send email');
        }
    } catch (error) {
        console.error('Send email error:', error);
        showNotification('郵件發送失敗：' + error.message, 'error');
        throw error;
    }
}

// AI 分析郵件
async function analyzeEmailWithAI(email) {
    try {
        const response = await fetch(`${API_BASE_URL}/ai/analyze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                emailContent: email.text || email.bodyPreview,
                subject: email.subject,
                from: email.from?.address || email.from?.emailAddress?.address
            })
        });

        const data = await response.json();

        if (data.success) {
            // 儲存 AI 分析結果
            AppState.aiNotes.set(email.id, data.analysis);
            return data.analysis;
        }
    } catch (error) {
        console.error('AI analysis error:', error);
    }
    return null;
}

// AI 生成回覆
async function generateAIReplyFromServer(emailContent, context = {}) {
    try {
        const response = await fetch(`${API_BASE_URL}/ai/generate-reply`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                emailContent,
                context
            })
        });

        const data = await response.json();

        if (data.success) {
            return data.reply.content;
        } else {
            throw new Error(data.error || 'Failed to generate reply');
        }
    } catch (error) {
        console.error('Generate reply error:', error);
        showNotification('AI 生成回覆失敗：' + error.message, 'error');
        return null;
    }
}

// 搜索郵件
async function searchEmailsOnServer(query) {
    try {
        const response = await fetch(`${API_BASE_URL}/email/search/${encodeURIComponent(query)}`);
        const data = await response.json();

        if (data.success) {
            displayRealEmails(data.emails);
            return data.emails;
        } else {
            throw new Error(data.error || 'Failed to search emails');
        }
    } catch (error) {
        console.error('Search emails error:', error);
        showNotification('搜索失敗：' + error.message, 'error');
        return [];
    }
}

// 標記為已讀
async function markEmailAsRead(emailId) {
    try {
        const response = await fetch(`${API_BASE_URL}/email/${emailId}/read`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        return data.success;
    } catch (error) {
        console.error('Mark as read error:', error);
        return false;
    }
}

// ===================================
// 顯示真實郵件
// ===================================

function displayRealEmails(emails) {
    const emailList = document.getElementById('emailList');
    if (!emailList) return;

    emailList.innerHTML = '';

    emails.forEach(email => {
        const emailItem = createEmailListItem(email);
        emailList.appendChild(emailItem);
    });
}

function createEmailListItem(email) {
    const div = document.createElement('div');
    div.className = 'email-item';
    if (!email.isRead) div.classList.add('unread');
    div.dataset.emailId = email.id;

    // 提取發件人信息
    const fromAddress = email.from?.address || email.from?.emailAddress?.address || 'Unknown';
    const fromName = email.from?.name || email.from?.emailAddress?.name || fromAddress;

    // 格式化時間
    const date = new Date(email.date || email.receivedDateTime);
    const timeStr = formatEmailTime(date);

    div.innerHTML = `
        <div class="email-sender">
            <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(fromName)}&size=40"
                 alt="Sender" class="sender-avatar">
            <div class="sender-info">
                <h4>${fromName}</h4>
                <span class="email-time">${timeStr}</span>
            </div>
        </div>
        <div class="email-preview">
            <h5 class="email-subject">${email.subject || '(無主旨)'}</h5>
            <p class="email-snippet">${email.bodyPreview || email.text?.substring(0, 100) || ''}</p>
        </div>
        <div class="email-meta">
            <span class="ai-label">AI 分析中...</span>
        </div>
    `;

    // 點擊事件
    div.addEventListener('click', async () => {
        await selectRealEmail(email.id);
    });

    // 異步獲取 AI 分析
    analyzeEmailWithAI(email).then(analysis => {
        if (analysis) {
            const aiLabel = div.querySelector('.ai-label');
            if (aiLabel) {
                aiLabel.textContent = `AI: ${analysis.summary.substring(0, 30)}...`;
                aiLabel.className = `ai-label ${analysis.sentiment}`;
            }
        }
    });

    return div;
}

// 選擇並顯示真實郵件
async function selectRealEmail(emailId) {
    const email = await fetchEmailById(emailId);
    if (!email) return;

    // 更新選中狀態
    document.querySelectorAll('.email-item').forEach(item => {
        item.classList.remove('selected');
        if (item.dataset.emailId === emailId) {
            item.classList.add('selected');
            item.classList.remove('unread');
        }
    });

    // 顯示郵件內容
    displayEmailContent(email);

    // 標記為已讀
    markEmailAsRead(emailId);

    AppState.selectedEmail = emailId;
}

function displayEmailContent(email) {
    // 更新郵件標題和元信息
    const titleEl = document.querySelector('.email-title');
    if (titleEl) titleEl.textContent = email.subject || '(無主旨)';

    const fromName = email.from?.name || email.from?.emailAddress?.name || email.from?.address || 'Unknown';
    const fromAddress = email.from?.address || email.from?.emailAddress?.address || '';

    const headerMetaEl = document.querySelector('.email-header-meta');
    if (headerMetaEl) {
        headerMetaEl.innerHTML = `
            <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(fromName)}&size=40"
                 alt="Sender" class="sender-avatar-large">
            <div>
                <h4>${fromName} <span class="email-address">&lt;${fromAddress}&gt;</span></h4>
                <p class="email-timestamp">${formatEmailTime(new Date(email.date || email.receivedDateTime))}</p>
            </div>
        `;
    }

    // 顯示郵件內容
    const contentEl = document.querySelector('.email-content');
    if (contentEl) {
        const htmlContent = email.html || email.body?.content || '';
        const textContent = email.text || email.bodyPreview || '';
        contentEl.innerHTML = htmlContent || `<p>${textContent.replace(/\n/g, '<br>')}</p>`;
    }

    // 顯示 AI 分析
    displayAIAnalysis(email.id);
}

function displayAIAnalysis(emailId) {
    const analysis = AppState.aiNotes.get(emailId);
    if (!analysis) return;

    const insightsContent = document.querySelector('.insights-content');
    if (!insightsContent) return;

    insightsContent.innerHTML = `
        <div class="insight-item priority-${analysis.priority}">
            <span class="insight-icon">🎯</span>
            <div>
                <strong>客戶意向度: ${analysis.customerIntent}</strong>
                <p>${analysis.summary}</p>
            </div>
        </div>
        <div class="insight-item">
            <span class="insight-icon">💼</span>
            <div>
                <strong>商機價值: ${analysis.estimatedValue}</strong>
                <p>緊急程度: ${analysis.urgencyLevel}</p>
            </div>
        </div>
        <div class="insight-item">
            <span class="insight-icon">📋</span>
            <div>
                <strong>建議行動</strong>
                <p>${analysis.suggestedAction}</p>
            </div>
        </div>
        ${analysis.keyPoints.length > 0 ? `
        <div class="insight-item">
            <span class="insight-icon">🔑</span>
            <div>
                <strong>關鍵點</strong>
                <ul class="suggestion-list">
                    ${analysis.keyPoints.map(kp => `<li>${kp.category}: ${kp.keyword || kp.values?.join(', ')}</li>`).join('')}
                </ul>
            </div>
        </div>
        ` : ''}
    `;
}

// 更新聯絡人面板
function updateContactsFromEmails(emails) {
    // 從郵件中提取聯絡人並更新聯絡人面板
    // 這裡可以實現聯絡人去重和分組邏輯
}

// 格式化郵件時間
function formatEmailTime(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '剛剛';
    if (minutes < 60) return `${minutes} 分鐘前`;
    if (hours < 24) return `${hours} 小時前`;
    if (days < 7) return `${days} 天前`;

    return date.toLocaleDateString('zh-TW');
}

// ===================================
// 初始化
// ===================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('Outlook AI 初始化...');

    // 初始化所有功能
    initDragAndDrop();
    initEmailList();
    initAssistantPanel();
    initReplyTabs();
    initSearch();
    initNavigation();
    initAIFeatures();

    // 自動載入真實郵件
    loadRealEmails();

    console.log('Outlook AI 初始化完成！');
});

// 載入真實郵件
async function loadRealEmails() {
    showNotification('正在連接郵件服務器...', 'info');

    try {
        const emails = await fetchEmailsFromServer({
            limit: 50,
            unreadOnly: false
        });

        if (emails.length > 0) {
            showNotification(`成功載入 ${emails.length} 封郵件！`, 'success');
        } else {
            showNotification('沒有找到郵件', 'warning');
        }
    } catch (error) {
        showNotification('郵件載入失敗，請檢查後端服務器是否運行', 'error');
    }
}

// ===================================
// 拖放功能 - 聯絡人卡片
// ===================================
function initDragAndDrop() {
    const contactCards = document.querySelectorAll('.contact-card[draggable="true"]');
    const completedZone = document.getElementById('completedZone');

    contactCards.forEach(card => {
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragend', handleDragEnd);
    });

    if (completedZone) {
        completedZone.addEventListener('dragover', handleDragOver);
        completedZone.addEventListener('dragleave', handleDragLeave);
        completedZone.addEventListener('drop', handleDrop);
    }
}

let draggedElement = null;

function handleDragStart(e) {
    draggedElement = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    this.classList.add('drag-over');
    return false;
}

function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }

    this.classList.remove('drag-over');

    if (draggedElement) {
        // 標記為已完成
        const contactId = draggedElement.dataset.contactId;
        markContactAsCompleted(contactId, draggedElement);
    }

    return false;
}

function markContactAsCompleted(contactId, cardElement) {
    // 添加動畫效果
    cardElement.style.transition = 'all 0.5s ease';
    cardElement.style.opacity = '0.5';
    cardElement.style.transform = 'scale(0.8)';

    setTimeout(() => {
        // 移除卡片
        cardElement.remove();

        // 更新狀態
        AppState.completedContacts.push(contactId);

        // 顯示通知
        showNotification(`已完成與聯絡人 #${contactId} 的溝通`, 'success');

        // 更新統計
        updateContactStats();
    }, 500);
}

function updateContactStats() {
    const pendingBadge = document.querySelector('.tab[data-filter="pending"] .badge');
    const completedBadge = document.querySelector('.tab[data-filter="completed"] .badge');

    if (pendingBadge) {
        const currentCount = parseInt(pendingBadge.textContent) || 0;
        pendingBadge.textContent = Math.max(0, currentCount - 1);
    }

    if (completedBadge) {
        const currentCount = parseInt(completedBadge.textContent) || 0;
        completedBadge.textContent = currentCount + 1;
    }
}

// ===================================
// 郵件列表交互
// ===================================
function initEmailList() {
    const emailItems = document.querySelectorAll('.email-item');

    emailItems.forEach(item => {
        item.addEventListener('click', function() {
            selectEmail(this);
        });
    });
}

function selectEmail(emailElement) {
    // 移除所有選中狀態
    document.querySelectorAll('.email-item').forEach(item => {
        item.classList.remove('selected');
    });

    // 添加選中狀態
    emailElement.classList.add('selected');

    // 移除未讀標記
    emailElement.classList.remove('unread');

    // 獲取郵件 ID 和聯絡人 ID
    const emailId = emailElement.dataset.emailId;
    const contactId = emailElement.dataset.contactId;

    // 更新狀態
    AppState.selectedEmail = emailId;

    // 更新郵件內容（這裡可以加載實際內容）
    loadEmailContent(emailId, contactId);

    // 添加動畫效果
    const contentPanel = document.querySelector('.email-content-panel');
    if (contentPanel) {
        contentPanel.style.animation = 'none';
        setTimeout(() => {
            contentPanel.style.animation = 'fadeIn 0.3s ease-in';
        }, 10);
    }
}

function loadEmailContent(emailId, contactId) {
    // 這裡可以加載實際的郵件內容
    // 現在只是模擬 AI 分析
    console.log(`載入郵件 ${emailId}，聯絡人 ${contactId}`);

    // 顯示 AI 筆記
    displayAINotesForEmail(contactId);
}

function displayAINotesForEmail(contactId) {
    const aiNotes = AppState.aiNotes[contactId];

    if (aiNotes) {
        console.log('AI 自動筆記:', aiNotes);
        // 這裡可以更新 UI 顯示 AI 筆記
    }
}

// ===================================
// AI 助手面板
// ===================================
function initAssistantPanel() {
    const assistantTabs = document.querySelectorAll('.assistant-tab');

    assistantTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            switchAssistantPanel(this.dataset.panel);
        });
    });

    // AI 面板切換按鈕
    const toggleBtn = document.getElementById('toggleAiPanel');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', function() {
            const assistantLayer = document.querySelector('.ai-assistant-layer');
            assistantLayer.classList.toggle('collapsed');
        });
    }
}

function switchAssistantPanel(panelName) {
    // 更新標籤狀態
    document.querySelectorAll('.assistant-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.panel === panelName) {
            tab.classList.add('active');
        }
    });

    // 更新面板顯示
    document.querySelectorAll('.assistant-panel').forEach(panel => {
        panel.classList.remove('active');
    });

    const targetPanel = document.getElementById(`${panelName}Panel`);
    if (targetPanel) {
        targetPanel.classList.add('active');
    }

    AppState.currentAssistantPanel = panelName;
}

// ===================================
// 回覆模式切換
// ===================================
function initReplyTabs() {
    const replyTabs = document.querySelectorAll('.reply-tab');

    replyTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            switchReplyMode(this.dataset.mode);
        });
    });

    // AI 生成回覆按鈕
    const generateBtn = document.querySelector('.generate-reply-btn');
    if (generateBtn) {
        generateBtn.addEventListener('click', generateAIReply);
    }

    // 發送按鈕
    const sendBtn = document.querySelector('.send-btn');
    if (sendBtn) {
        sendBtn.addEventListener('click', sendReply);
    }
}

function switchReplyMode(mode) {
    // 更新標籤狀態
    document.querySelectorAll('.reply-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.mode === mode) {
            tab.classList.add('active');
        }
    });

    console.log(`切換到回覆模式: ${mode}`);
}

async function generateAIReply() {
    const textarea = document.querySelector('.reply-textarea');
    if (!textarea) return;

    // 顯示載入動畫
    textarea.value = '正在生成 AI 回覆...';
    textarea.disabled = true;

    try {
        // 獲取當前選中的郵件
        const emailId = AppState.selectedEmail;
        const email = AppState.emailCache.get(emailId);

        if (!email) {
            throw new Error('請先選擇一封郵件');
        }

        // 調用後端 AI 生成回覆
        const emailContent = email.text || email.bodyPreview || '';
        const reply = await generateAIReplyFromServer(emailContent, {
            originalSubject: email.subject,
            from: email.from
        });

        if (reply) {
            textarea.value = reply;
            showNotification('AI 回覆已生成', 'success');
        } else {
            throw new Error('AI 回覆生成失敗');
        }
    } catch (error) {
        textarea.value = '';
        showNotification(error.message, 'error');
    } finally {
        textarea.disabled = false;
    }
}

async function sendReply() {
    const textarea = document.querySelector('.reply-textarea');
    if (!textarea || !textarea.value.trim()) {
        showNotification('請輸入回覆內容', 'warning');
        return;
    }

    try {
        showNotification('正在發送...', 'info');

        // 獲取當前選中的郵件
        const emailId = AppState.selectedEmail;
        const email = AppState.emailCache.get(emailId);

        if (!email) {
            throw new Error('找不到原始郵件');
        }

        // 準備郵件數據
        const toAddress = email.from?.address || email.from?.emailAddress?.address;
        const emailData = {
            to: toAddress,
            subject: `Re: ${email.subject}`,
            text: textarea.value,
            html: textarea.value.replace(/\n/g, '<br>'),
            inReplyTo: email.messageId
        };

        // 發送到後端
        await sendEmailToServer(emailData);

        textarea.value = '';
        showNotification('郵件已發送！', 'success');

        // 更新統計
        updateEmailStats();
    } catch (error) {
        showNotification('發送失敗：' + error.message, 'error');
    }
}

function updateEmailStats() {
    const statusItem = document.querySelector('.status-item:last-child');
    if (statusItem) {
        const currentCount = parseInt(statusItem.textContent.match(/\d+/)) || 0;
        statusItem.textContent = `今日處理: ${currentCount + 1} 封郵件`;
    }
}

// ===================================
// 搜索功能
// ===================================
function initSearch() {
    const searchInput = document.getElementById('emailSearch');
    if (!searchInput) return;

    searchInput.addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase();
        filterEmails(searchTerm);
    });
}

function filterEmails(searchTerm) {
    const emailItems = document.querySelectorAll('.email-item');

    emailItems.forEach(item => {
        const subject = item.querySelector('.email-subject').textContent.toLowerCase();
        const snippet = item.querySelector('.email-snippet').textContent.toLowerCase();
        const sender = item.querySelector('.sender-info h4').textContent.toLowerCase();

        if (subject.includes(searchTerm) || snippet.includes(searchTerm) || sender.includes(searchTerm)) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
}

// ===================================
// 導航功能
// ===================================
function initNavigation() {
    const navBtns = document.querySelectorAll('.nav-btn');

    navBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            switchView(this.dataset.view);
        });
    });

    // 聯絡人篩選標籤
    const filterTabs = document.querySelectorAll('.filter-tabs .tab');
    filterTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            filterContacts(this.dataset.filter);
        });
    });
}

function switchView(view) {
    // 更新導航按鈕狀態
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.view === view) {
            btn.classList.add('active');
        }
    });

    AppState.currentView = view;
    console.log(`切換到視圖: ${view}`);

    // 這裡可以加載不同視圖的內容
}

function filterContacts(filter) {
    // 更新標籤狀態
    document.querySelectorAll('.filter-tabs .tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.filter === filter) {
            tab.classList.add('active');
        }
    });

    AppState.contactsFilter = filter;
    console.log(`篩選聯絡人: ${filter}`);

    // 這裡可以實現實際的篩選邏輯
}

// ===================================
// AI 功能模組
// ===================================
function initAIFeatures() {
    // 模擬 AI 分析
    simulateAIAnalysis();

    // 建議操作按鈕
    const actionButtons = document.querySelectorAll('.action-btn-small.primary');
    actionButtons.forEach(btn => {
        if (btn.textContent.includes('立即處理')) {
            btn.addEventListener('click', handleImmediateAction);
        }
    });

    // 跟催相關按鈕
    const followupButtons = document.querySelectorAll('.step-btn');
    followupButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            handleFollowupAction(this.textContent);
        });
    });

    // 建議芯片
    const suggestionChips = document.querySelectorAll('.suggestion-chip');
    suggestionChips.forEach(chip => {
        chip.addEventListener('click', function() {
            applySuggestion(this.textContent);
        });
    });
}

function simulateAIAnalysis() {
    // 模擬 AI 持續分析
    setInterval(() => {
        // 更新 AI 處理狀態
        const aiStatus = document.querySelector('.status-right .status-item:first-child');
        if (aiStatus) {
            const currentTasks = Math.floor(Math.random() * 5) + 1;
            aiStatus.textContent = `AI 處理中: ${currentTasks} 項任務`;
        }
    }, 5000);
}

function handleImmediateAction() {
    showNotification('正在處理緊急任務...', 'info');

    setTimeout(() => {
        showNotification('任務已加入優先處理隊列', 'success');
    }, 1000);
}

function handleFollowupAction(action) {
    console.log(`執行跟催操作: ${action}`);
    showNotification(`${action}操作已執行`, 'success');
}

function applySuggestion(suggestion) {
    console.log(`應用建議: ${suggestion}`);
    showNotification(`已應用建議: ${suggestion}`, 'success');
}

// ===================================
// 通知系統
// ===================================
function showNotification(message, type = 'info') {
    // 創建通知元素
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    // 添加樣式
    Object.assign(notification.style, {
        position: 'fixed',
        top: '80px',
        right: '20px',
        padding: '16px 24px',
        borderRadius: '8px',
        color: 'white',
        fontWeight: '500',
        fontSize: '14px',
        zIndex: '10000',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        animation: 'slideInRight 0.3s ease-out',
        maxWidth: '400px'
    });

    // 設置背景顏色
    const colors = {
        success: '#00C853',
        error: '#F44336',
        warning: '#FFC107',
        info: '#2196F3'
    };
    notification.style.background = colors[type] || colors.info;

    // 添加到頁面
    document.body.appendChild(notification);

    // 3秒後自動移除
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// 添加動畫樣式
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// ===================================
// AI 自動筆記功能
// ===================================
class AINotesManager {
    constructor() {
        this.notes = new Map();
    }

    // 分析郵件並生成筆記
    analyzeEmail(emailId, emailContent) {
        const analysis = {
            summary: this.extractSummary(emailContent),
            keyPoints: this.extractKeyPoints(emailContent),
            sentiment: this.analyzeSentiment(emailContent),
            priority: this.calculatePriority(emailContent),
            suggestedAction: this.suggestAction(emailContent),
            timestamp: new Date().toISOString()
        };

        this.notes.set(emailId, analysis);
        return analysis;
    }

    extractSummary(content) {
        // 簡化的摘要提取（實際應該使用 NLP API）
        return content.substring(0, 100) + '...';
    }

    extractKeyPoints(content) {
        // 提取關鍵點
        const keywords = ['價格', '數量', '交貨', '折扣', '截止', '緊急'];
        const points = [];

        keywords.forEach(keyword => {
            if (content.includes(keyword)) {
                points.push(`包含關鍵詞：${keyword}`);
            }
        });

        return points;
    }

    analyzeSentiment(content) {
        // 情感分析
        const positiveWords = ['感謝', '高興', '期待', '滿意'];
        const urgentWords = ['緊急', '立即', '儘快', '截止'];

        if (urgentWords.some(word => content.includes(word))) {
            return 'urgent';
        } else if (positiveWords.some(word => content.includes(word))) {
            return 'positive';
        }

        return 'neutral';
    }

    calculatePriority(content) {
        // 計算優先級
        const urgentKeywords = ['緊急', '立即', '今天', '截止'];
        const score = urgentKeywords.filter(keyword => content.includes(keyword)).length;

        if (score >= 2) return 'high';
        if (score === 1) return 'medium';
        return 'low';
    }

    suggestAction(content) {
        // 建議行動
        if (content.includes('報價')) {
            return '準備並發送報價單';
        } else if (content.includes('會議')) {
            return '安排會議時間';
        } else if (content.includes('確認')) {
            return '確認相關資訊';
        }

        return '查看並回覆郵件';
    }

    getNotes(emailId) {
        return this.notes.get(emailId);
    }

    getAllNotes() {
        return Array.from(this.notes.entries());
    }
}

// 創建全局 AI 筆記管理器
window.aiNotesManager = new AINotesManager();

// ===================================
// 工具函數
// ===================================
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function formatDate(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '剛剛';
    if (minutes < 60) return `${minutes} 分鐘前`;
    if (hours < 24) return `${hours} 小時前`;
    if (days < 7) return `${days} 天前`;

    return date.toLocaleDateString('zh-TW');
}

// ===================================
// 導出 API
// ===================================
window.OutlookAI = {
    state: AppState,
    showNotification,
    switchView,
    selectEmail,
    markContactAsCompleted,
    generateAIReply,
    aiNotesManager: window.aiNotesManager
};

console.log('Outlook AI API 已就緒');
