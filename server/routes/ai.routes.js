// ===================================
// AI API 路由
// ===================================

const express = require('express');
const router = express.Router();
const aiService = require('../services/ai.service');

// AI 分析郵件
router.post('/analyze', async (req, res) => {
    try {
        const { emailContent, subject, from } = req.body;

        if (!emailContent) {
            return res.status(400).json({
                success: false,
                error: 'Email content is required'
            });
        }

        const analysis = await aiService.analyzeEmail({
            content: emailContent,
            subject,
            from
        });

        res.json({
            success: true,
            analysis
        });
    } catch (error) {
        console.error('AI analyze error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// AI 生成回覆
router.post('/generate-reply', async (req, res) => {
    try {
        const { emailContent, context } = req.body;

        if (!emailContent) {
            return res.status(400).json({
                success: false,
                error: 'Email content is required'
            });
        }

        const reply = await aiService.generateReply(emailContent, context);

        res.json({
            success: true,
            reply
        });
    } catch (error) {
        console.error('Generate reply error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// AI 提取關鍵點
router.post('/extract-keypoints', async (req, res) => {
    try {
        const { emailContent } = req.body;

        if (!emailContent) {
            return res.status(400).json({
                success: false,
                error: 'Email content is required'
            });
        }

        const keypoints = await aiService.extractKeyPoints(emailContent);

        res.json({
            success: true,
            keypoints
        });
    } catch (error) {
        console.error('Extract keypoints error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// AI 計算優先級
router.post('/calculate-priority', async (req, res) => {
    try {
        const { emailContent, subject, from } = req.body;

        const priority = await aiService.calculatePriority({
            content: emailContent,
            subject,
            from
        });

        res.json({
            success: true,
            priority
        });
    } catch (error) {
        console.error('Calculate priority error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// AI 情感分析
router.post('/sentiment', async (req, res) => {
    try {
        const { emailContent } = req.body;

        if (!emailContent) {
            return res.status(400).json({
                success: false,
                error: 'Email content is required'
            });
        }

        const sentiment = await aiService.analyzeSentiment(emailContent);

        res.json({
            success: true,
            sentiment
        });
    } catch (error) {
        console.error('Sentiment analysis error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// AI 提取待辦事項
router.post('/extract-todos', async (req, res) => {
    try {
        const { emailContent, emailSubject } = req.body;

        if (!emailContent) {
            return res.status(400).json({
                success: false,
                error: 'Email content is required'
            });
        }

        const todos = await aiService.extractTodos(emailContent, emailSubject);

        res.json({
            success: true,
            todos
        });
    } catch (error) {
        console.error('Extract todos error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// AI 批次分析郵件
router.post('/batch-analyze', async (req, res) => {
    try {
        const { emails } = req.body;

        if (!emails || !Array.isArray(emails)) {
            return res.status(400).json({
                success: false,
                error: 'Emails array is required'
            });
        }

        if (emails.length === 0) {
            return res.json({
                success: true,
                results: []
            });
        }

        // 限制批次大小避免超時
        if (emails.length > 20) {
            return res.status(400).json({
                success: false,
                error: 'Batch size cannot exceed 20 emails'
            });
        }

        const results = await aiService.analyzeEmailBatch(emails);

        res.json({
            success: true,
            results,
            count: results.length
        });
    } catch (error) {
        console.error('Batch analyze error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 取得 AI 服務狀態
router.get('/status', (req, res) => {
    try {
        const status = {
            enabled: aiService.enabled,
            hasOpenAI: !!aiService.openai,
            model: aiService.model || 'N/A',
            features: {
                emailAnalysis: true,
                replyGeneration: true,
                todoExtraction: true,
                batchProcessing: true,
                aiEnhancement: aiService.enabled && !!aiService.openai
            }
        };

        res.json({
            success: true,
            status
        });
    } catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
