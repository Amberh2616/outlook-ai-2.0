// ===================================
// Outlook AI - 智能郵件管理系統
// JavaScript 交互功能
// ===================================

// 應用狀態管理
const AppState = {
    currentView: 'inbox',
    selectedEmail: null,
    currentAssistantPanel: 'merchandising',
    contactsFilter: 'pending',
    completedContacts: [],

    // AI 模擬數據
    aiNotes: {
        1: {
            summary: '高優先級客戶，預算充足，採購意願強烈',
            keyPoints: ['採購數量 500-1000 件', '預算範圍 $50K-$100K', '本月底決定'],
            nextAction: '今天下午 2:00 前回覆報價',
            sentiment: 'positive'
        },
        2: {
            summary: '物流問題需要緊急處理，客戶等待確認',
            keyPoints: ['今日截止', '需要確認配送時間', '客戶有時間壓力'],
            nextAction: '立即聯繫物流部門確認',
            sentiment: 'urgent'
        }
    }
};

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

    console.log('Outlook AI 初始化完成！');
});

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

function generateAIReply() {
    const textarea = document.querySelector('.reply-textarea');
    if (!textarea) return;

    // 顯示載入動畫
    textarea.value = '正在生成 AI 回覆...';
    textarea.disabled = true;

    // 模擬 AI 生成
    setTimeout(() => {
        const aiReply = `親愛的王小明，

感謝您對我們 X100 智能設備系列的關注！

針對您的詢問，我很高興為您提供以下資訊：

1. **產品規格**：我已將 X100 的完整規格文件附加在本郵件中
2. **報價方案**：
   - 500-749 件：享 12% 折扣
   - 750-999 件：享 15% 折扣
   - 1000 件以上：享 18% 折扣
3. **交貨期**：確認訂單後 3-5 個工作日內出貨
4. **售後服務**：提供一年保固及全天候技術支援

我們注意到您希望在本月底前做出決定，我們完全理解時效的重要性。如果您需要任何進一步的資訊或希望安排產品演示，請隨時與我聯繫。

期待與貴公司合作！

最誠摯的問候
Amber`;

        textarea.value = aiReply;
        textarea.disabled = false;
        showNotification('AI 回覆已生成', 'success');
    }, 1500);
}

function sendReply() {
    const textarea = document.querySelector('.reply-textarea');
    if (!textarea || !textarea.value.trim()) {
        showNotification('請輸入回覆內容', 'warning');
        return;
    }

    // 模擬發送
    showNotification('正在發送...', 'info');

    setTimeout(() => {
        textarea.value = '';
        showNotification('郵件已發送！', 'success');

        // 更新統計
        updateEmailStats();
    }, 1000);
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
