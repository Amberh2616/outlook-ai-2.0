// ===================================
// AI 服務
// 郵件分析、生成回覆、提取關鍵點等
// ===================================

const OpenAI = require('openai');

class AIService {
    constructor() {
        this.enabled = process.env.ENABLE_AI_ANALYSIS === 'true';

        // 初始化 OpenAI 客戶端
        if (this.enabled && process.env.OPENAI_API_KEY) {
            this.openai = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY
            });
            this.model = 'gpt-4o'; // 使用 GPT-4o 模型
            console.log('✅ OpenAI AI Service initialized with API key');
        } else {
            console.log('⚠️  AI Service running in basic mode (no OpenAI API)');
        }
    }

    // 分析郵件
    async analyzeEmail(emailData) {
        const { content, subject, from } = emailData;

        // 基礎分析（不使用 AI API）
        const analysis = {
            summary: this.generateSummary(content),
            keyPoints: this.extractKeyPoints(content),
            sentiment: this.analyzeSentiment(content),
            priority: this.calculatePriority(emailData),
            suggestedAction: this.suggestAction(content, subject),
            customerIntent: this.analyzeIntent(content),
            urgencyLevel: this.calculateUrgency(content, subject),
            estimatedValue: this.estimateBusinessValue(content),
            timestamp: new Date().toISOString()
        };

        // 如果啟用 OpenAI，使用 AI 增強分析
        if (this.enabled && process.env.OPENAI_API_KEY) {
            try {
                const aiEnhanced = await this.enhanceWithAI(content, subject);
                return { ...analysis, ...aiEnhanced };
            } catch (error) {
                console.error('AI enhancement error:', error);
                return analysis;
            }
        }

        return analysis;
    }

    // 批次分析多封郵件
    async analyzeEmailBatch(emails) {
        if (!emails || emails.length === 0) {
            return [];
        }

        // 使用 Promise.all 平行處理，但限制同時處理數量避免 rate limit
        const batchSize = 5;
        const results = [];

        for (let i = 0; i < emails.length; i += batchSize) {
            const batch = emails.slice(i, i + batchSize);
            const batchResults = await Promise.all(
                batch.map(email => this.analyzeEmail(email))
            );
            results.push(...batchResults);

            // 避免 rate limit，批次間休息 1 秒
            if (i + batchSize < emails.length && this.enabled && this.openai) {
                await this.sleep(1000);
            }
        }

        return results;
    }

    // Sleep utility
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 生成摘要
    generateSummary(content) {
        if (!content) return '無內容';

        // 清理文本
        const cleanText = content
            .replace(/<[^>]*>/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        // 提取前 150 個字符
        const summary = cleanText.substring(0, 150);

        return summary + (cleanText.length > 150 ? '...' : '');
    }

    // 提取關鍵點
    extractKeyPoints(content) {
        if (!content) return [];

        const keyPoints = [];
        const cleanText = content.replace(/<[^>]*>/g, '').toLowerCase();

        // 關鍵字檢測
        const keywords = {
            price: ['價格', '報價', '費用', '成本', 'price', 'cost', 'quote'],
            quantity: ['數量', '批量', '件', 'quantity', 'amount', 'pieces'],
            deadline: ['截止', '期限', '時間', 'deadline', 'due date', 'urgent'],
            meeting: ['會議', '討論', '見面', 'meeting', 'call', 'discuss'],
            contract: ['合約', '契約', '協議', 'contract', 'agreement'],
            delivery: ['交貨', '配送', '物流', 'delivery', 'shipping'],
            discount: ['折扣', '優惠', 'discount', 'promotion'],
            payment: ['付款', '支付', 'payment', 'invoice']
        };

        for (const [category, words] of Object.entries(keywords)) {
            for (const word of words) {
                if (cleanText.includes(word)) {
                    keyPoints.push({
                        category,
                        keyword: word,
                        importance: 'high'
                    });
                    break;
                }
            }
        }

        // 提取數字（可能是價格、數量等）
        const numbers = cleanText.match(/\d+[,.]?\d*/g);
        if (numbers && numbers.length > 0) {
            keyPoints.push({
                category: 'numbers',
                values: numbers.slice(0, 3),
                importance: 'medium'
            });
        }

        return keyPoints;
    }

    // 情感分析
    analyzeSentiment(content) {
        if (!content) return 'neutral';

        const cleanText = content.toLowerCase();

        // 積極詞彙
        const positiveWords = [
            '感謝', '高興', '期待', '滿意', '優秀', '完美', '很好',
            'thank', 'happy', 'great', 'excellent', 'perfect', 'appreciate'
        ];

        // 緊急詞彙
        const urgentWords = [
            '緊急', '立即', '儘快', '馬上', '今天', '現在',
            'urgent', 'immediately', 'asap', 'critical', 'now'
        ];

        // 負面詞彙
        const negativeWords = [
            '問題', '錯誤', '失望', '不滿', '投訴', '延遲',
            'problem', 'issue', 'disappointed', 'complaint', 'delay', 'error'
        ];

        let positiveCount = 0;
        let urgentCount = 0;
        let negativeCount = 0;

        positiveWords.forEach(word => {
            if (cleanText.includes(word)) positiveCount++;
        });

        urgentWords.forEach(word => {
            if (cleanText.includes(word)) urgentCount++;
        });

        negativeWords.forEach(word => {
            if (cleanText.includes(word)) negativeCount++;
        });

        if (urgentCount >= 2) return 'urgent';
        if (negativeCount >= 2) return 'negative';
        if (positiveCount >= 2) return 'positive';

        return 'neutral';
    }

    // 計算優先級
    calculatePriority(emailData) {
        const { content, subject, from } = emailData;

        let score = 0;

        // 根據主旨判斷
        const urgentSubjectWords = ['緊急', 'urgent', '重要', 'important', '立即', 'immediate'];
        if (subject) {
            urgentSubjectWords.forEach(word => {
                if (subject.toLowerCase().includes(word)) score += 20;
            });
        }

        // 根據內容判斷
        const urgentContentWords = ['截止', '今天', '馬上', 'deadline', 'today', 'asap'];
        if (content) {
            urgentContentWords.forEach(word => {
                if (content.toLowerCase().includes(word)) score += 10;
            });
        }

        // 商業價值相關
        const businessWords = ['訂單', '採購', '合約', '報價', 'order', 'purchase', 'contract'];
        if (content) {
            businessWords.forEach(word => {
                if (content.toLowerCase().includes(word)) score += 15;
            });
        }

        // 數字金額（可能是大訂單）
        const numbers = content?.match(/\$?\d{4,}|\d+[kKmM]/g);
        if (numbers && numbers.length > 0) score += 15;

        // 計算優先級
        if (score >= 50) return 'high';
        if (score >= 30) return 'medium';
        return 'low';
    }

    // 建議行動
    suggestAction(content, subject) {
        if (!content) return '查看郵件';

        const cleanText = (content + ' ' + (subject || '')).toLowerCase();

        if (cleanText.includes('報價') || cleanText.includes('quote') || cleanText.includes('price')) {
            return '準備並發送報價單';
        }

        if (cleanText.includes('會議') || cleanText.includes('meeting') || cleanText.includes('討論')) {
            return '安排會議時間';
        }

        if (cleanText.includes('確認') || cleanText.includes('confirm')) {
            return '確認相關資訊並回覆';
        }

        if (cleanText.includes('問題') || cleanText.includes('issue') || cleanText.includes('problem')) {
            return '調查問題並提供解決方案';
        }

        if (cleanText.includes('訂單') || cleanText.includes('order') || cleanText.includes('purchase')) {
            return '處理訂單並確認細節';
        }

        if (cleanText.includes('緊急') || cleanText.includes('urgent')) {
            return '立即處理並回覆';
        }

        return '查看並回覆郵件';
    }

    // 分析客戶意圖
    analyzeIntent(content) {
        if (!content) return 'unknown';

        const cleanText = content.toLowerCase();

        const intents = {
            inquiry: ['詢問', '想了解', '請問', 'inquiry', 'question', 'ask'],
            purchase: ['採購', '訂購', '購買', '下單', 'purchase', 'order', 'buy'],
            complaint: ['投訴', '問題', '不滿', 'complaint', 'issue', 'problem'],
            follow_up: ['跟進', '後續', '確認', 'follow up', 'update', 'status'],
            negotiation: ['議價', '折扣', '優惠', 'negotiate', 'discount', 'deal']
        };

        for (const [intent, keywords] of Object.entries(intents)) {
            for (const keyword of keywords) {
                if (cleanText.includes(keyword)) {
                    return intent;
                }
            }
        }

        return 'general';
    }

    // 計算緊急程度
    calculateUrgency(content, subject) {
        let urgencyScore = 0;

        const text = (content + ' ' + (subject || '')).toLowerCase();

        const urgencyKeywords = [
            { word: '緊急', score: 30 },
            { word: 'urgent', score: 30 },
            { word: '立即', score: 25 },
            { word: 'immediately', score: 25 },
            { word: '今天', score: 20 },
            { word: 'today', score: 20 },
            { word: 'asap', score: 25 },
            { word: '截止', score: 20 },
            { word: 'deadline', score: 20 }
        ];

        urgencyKeywords.forEach(({ word, score }) => {
            if (text.includes(word)) urgencyScore += score;
        });

        if (urgencyScore >= 50) return 'critical';
        if (urgencyScore >= 30) return 'high';
        if (urgencyScore >= 15) return 'medium';
        return 'low';
    }

    // 估算商業價值
    estimateBusinessValue(content) {
        if (!content) return 'unknown';

        const cleanText = content.toLowerCase();

        // 提取金額
        const amounts = content.match(/\$[\d,]+|\d+[kKmM]|[\d,]+\s*元/g);
        if (amounts && amounts.length > 0) {
            // 嘗試解析金額
            const firstAmount = amounts[0].replace(/[^\d]/g, '');
            const value = parseInt(firstAmount);

            if (value >= 100000) return 'very_high';
            if (value >= 50000) return 'high';
            if (value >= 10000) return 'medium';
            return 'low';
        }

        // 根據關鍵字判斷
        if (cleanText.includes('大量') || cleanText.includes('批量') || cleanText.includes('bulk')) {
            return 'high';
        }

        if (cleanText.includes('合約') || cleanText.includes('contract') || cleanText.includes('partnership')) {
            return 'high';
        }

        return 'unknown';
    }

    // 使用 OpenAI API 增強分析
    async enhanceWithAI(content, subject) {
        if (!this.openai) {
            return {
                aiEnhanced: false,
                confidence: 0
            };
        }

        try {
            const prompt = `你是專業的商業郵件分析助手。請分析以下郵件並提供結構化的分析結果。

郵件資訊：
主旨: ${subject || '無主旨'}
內容:
${content}

請以 JSON 格式回應，包含以下欄位：
{
    "opportunityValue": "估計商業價值金額（例如 $50K-$100K），如果無法估計則為 null",
    "commercialIntent": "商業意圖評分 0-100，100 表示非常明確的購買意圖",
    "keyInsights": ["深入洞察1", "深入洞察2"],
    "suggestedResponse": "建議的專業回覆內容（繁體中文）",
    "nextSteps": ["後續步驟1", "後續步驟2"],
    "risks": ["潛在風險或需要注意的點"],
    "aiConfidence": "AI 分析的信心指數 0-1"
}`;

            const completion = await this.openai.chat.completions.create({
                model: this.model,
                messages: [
                    { role: 'system', content: '你是專業的商業郵件分析專家，擅長識別商業機會和客戶需求。' },
                    { role: 'user', content: prompt }
                ],
                response_format: { type: 'json_object' },
                temperature: 0.7,
                max_tokens: 1000
            });

            const aiAnalysis = JSON.parse(completion.choices[0].message.content);

            console.log(`✅ AI enhanced analysis completed: ${subject}`);

            return {
                aiEnhanced: true,
                ...aiAnalysis,
                tokenUsage: completion.usage,
                apiCost: this.calculateAPICost(completion.usage)
            };

        } catch (error) {
            console.error('❌ OpenAI API error:', error.message);
            return {
                aiEnhanced: false,
                error: error.message,
                confidence: 0
            };
        }
    }

    // 計算 API 使用成本
    calculateAPICost(usage) {
        if (!usage) return 0;

        // GPT-4o 定價 (2024)
        const inputCostPer1k = 0.0025;  // $0.0025 per 1K input tokens
        const outputCostPer1k = 0.010;  // $0.010 per 1K output tokens

        const inputCost = (usage.prompt_tokens / 1000) * inputCostPer1k;
        const outputCost = (usage.completion_tokens / 1000) * outputCostPer1k;

        return parseFloat((inputCost + outputCost).toFixed(6));
    }

    // 生成回覆
    async generateReply(emailContent, context = {}) {
        const {
            tone = 'professional',
            language = 'zh-TW',
            includeGreeting = true,
            includeSignature = true
        } = context;

        // 如果啟用 OpenAI，使用 AI 生成回覆
        if (this.enabled && this.openai) {
            try {
                return await this.generateAIReply(emailContent, context);
            } catch (error) {
                console.error('❌ AI reply generation failed, using template:', error.message);
                // 失敗時回退到模板回覆
            }
        }

        // 分析郵件內容
        const analysis = await this.analyzeEmail({ content: emailContent });

        // 根據意圖生成不同類型的回覆
        let replyTemplate = '';

        if (analysis.customerIntent === 'inquiry') {
            replyTemplate = this.generateInquiryReply(emailContent, analysis);
        } else if (analysis.customerIntent === 'purchase') {
            replyTemplate = this.generatePurchaseReply(emailContent, analysis);
        } else if (analysis.customerIntent === 'complaint') {
            replyTemplate = this.generateComplaintReply(emailContent, analysis);
        } else {
            replyTemplate = this.generateGeneralReply(emailContent, analysis);
        }

        return {
            content: replyTemplate,
            tone,
            suggestedSubject: `Re: ${context.originalSubject || ''}`,
            analysis
        };
    }

    // 使用 OpenAI 生成 AI 回覆
    async generateAIReply(emailContent, context = {}) {
        const prompt = `你是專業的商業郵件助手。請為以下郵件撰寫一封專業、友善且有效的回覆。

原始郵件：
主旨: ${context.originalSubject || '無主旨'}
寄件人: ${context.from || '未知'}
內容:
${emailContent}

${context.additionalContext ? `額外資訊: ${context.additionalContext}` : ''}

回覆要求：
1. 使用繁體中文
2. 保持專業但友善的語氣
3. 針對郵件內容提供具體且有價值的回應
4. 如果是詢價或合作，展現積極態度但保留細節待後續討論
5. 結尾提供明確的後續步驟或行動呼籲
6. 適當長度（150-300字）

請直接提供回覆內容（包含稱呼和結尾，但不需要包含主旨）：`;

        const completion = await this.openai.chat.completions.create({
            model: this.model,
            messages: [
                { role: 'system', content: '你是專業的商業郵件回覆助手，擅長撰寫得體且有效的商業郵件。' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.8,
            max_tokens: 600
        });

        const reply = completion.choices[0].message.content.trim();

        console.log(`✅ AI reply generated for: ${context.originalSubject}`);

        return {
            content: reply,
            aiGenerated: true,
            suggestedSubject: `Re: ${context.originalSubject || ''}`,
            tokenUsage: completion.usage,
            apiCost: this.calculateAPICost(completion.usage)
        };
    }

    // 從郵件中提取待辦事項
    async extractTodos(emailContent, emailSubject = '') {
        if (!this.enabled || !this.openai) {
            // 基礎版本 - 返回通用待辦事項
            return [
                { text: '查看並回覆郵件', priority: 'medium', deadline: null },
                { text: '跟進客戶需求', priority: 'medium', deadline: null }
            ];
        }

        try {
            const prompt = `請從以下郵件中提取需要執行的待辦事項。

郵件主旨: ${emailSubject}
郵件內容:
${emailContent}

請以 JSON 格式回應，包含一個 "todos" 陣列，每個待辦事項包含：
{
    "todos": [
        {
            "text": "待辦事項描述（簡潔明確）",
            "priority": "high" | "medium" | "low",
            "deadline": "建議完成日期 MM/DD 格式，如果無法確定則為 null",
            "category": "reply" | "followup" | "preparation" | "meeting" | "other"
        }
    ]
}

如果沒有明確的待辦事項，請根據郵件內容提供 2-3 個合理的後續行動建議。`;

            const completion = await this.openai.chat.completions.create({
                model: this.model,
                messages: [
                    { role: 'system', content: '你是專業的任務管理助手，擅長從郵件中提取行動項目。' },
                    { role: 'user', content: prompt }
                ],
                response_format: { type: 'json_object' },
                temperature: 0.7,
                max_tokens: 400
            });

            const result = JSON.parse(completion.choices[0].message.content);
            const todos = result.todos || [];

            console.log(`✅ Extracted ${todos.length} todos from email: ${emailSubject}`);

            return todos;

        } catch (error) {
            console.error('❌ Todo extraction error:', error.message);
            return [
                { text: '查看並回覆郵件', priority: 'medium', deadline: null },
                { text: '跟進客戶需求', priority: 'medium', deadline: null }
            ];
        }
    }

    // 生成諮詢回覆
    generateInquiryReply(content, analysis) {
        return `您好，

感謝您的來信詢問。

針對您的問題，我很樂意為您提供以下資訊：

[請在此處填寫具體回覆內容]

如果您需要更詳細的資訊或有其他問題，請隨時與我聯繫。

期待您的回覆！

最誠摯的問候`;
    }

    // 生成採購回覆
    generatePurchaseReply(content, analysis) {
        return `您好，

感謝您的訂購意願！

我已收到您的採購需求，相關資訊如下：

${analysis.keyPoints.map(kp => `- ${kp.category}: ${kp.keyword || kp.values?.join(', ')}`).join('\n')}

我們會盡快為您準備詳細的報價和產品資訊。

如有任何問題，請隨時與我聯繫。

期待與您合作！

最誠摯的問候`;
    }

    // 生成投訴回覆
    generateComplaintReply(content, analysis) {
        return `您好，

非常抱歉給您帶來不便。

我們已收到您的反饋，並高度重視此問題。我們的團隊正在調查此事，會盡快為您提供解決方案。

我們會在 24 小時內與您聯繫，告知處理進度。

再次為此次經歷表示歉意，感謝您的耐心和理解。

最誠摯的問候`;
    }

    // 生成一般回覆
    generateGeneralReply(content, analysis) {
        return `您好，

感謝您的來信。

我已收到您的郵件，${analysis.suggestedAction}。

如有任何問題或需要進一步協助，請隨時與我聯繫。

期待您的回覆！

最誠摯的問候`;
    }
}

module.exports = new AIService();
