// ===================================
// 郵件 API 路由
// ===================================

const express = require('express');
const router = express.Router();

// 根據配置選擇服務
const serviceType = process.env.EMAIL_SERVICE_TYPE || 'imap';
let emailService;

if (serviceType === 'outlook' && process.env.AZURE_CLIENT_ID) {
    emailService = require('../services/graph.service');
} else {
    emailService = require('../services/email.service');
}

// ===================================
// 郵件操作路由
// ===================================

// 獲取郵件列表
router.get('/list', async (req, res) => {
    try {
        const options = {
            folder: req.query.folder || 'INBOX',
            limit: parseInt(req.query.limit) || 50,
            offset: parseInt(req.query.offset) || 0,
            unreadOnly: req.query.unreadOnly === 'true',
            since: req.query.since || null,
            includeAIAnalysis: req.query.includeAI === 'true' // 支援 AI 分析
        };

        const emails = await emailService.fetchEmails(options);

        res.json({
            success: true,
            count: emails.length,
            emails: emails
        });
    } catch (error) {
        console.error('Fetch emails error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 獲取單個郵件
router.get('/:emailId', async (req, res) => {
    try {
        const { emailId } = req.params;
        const folder = req.query.folder || 'INBOX';

        const email = await emailService.fetchEmailById(emailId, folder);

        res.json({
            success: true,
            email: email
        });
    } catch (error) {
        console.error('Fetch email error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 發送郵件
router.post('/send', async (req, res) => {
    try {
        const emailData = req.body;

        // 驗證必填欄位
        if (!emailData.to || !emailData.subject) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: to, subject'
            });
        }

        const result = await emailService.sendEmail(emailData);

        res.json({
            success: true,
            result: result
        });
    } catch (error) {
        console.error('Send email error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 標記為已讀
router.post('/:emailId/read', async (req, res) => {
    try {
        const { emailId } = req.params;
        const folder = req.body.folder || 'INBOX';

        await emailService.markAsRead(emailId, folder);

        res.json({
            success: true,
            message: 'Email marked as read'
        });
    } catch (error) {
        console.error('Mark as read error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 標記為未讀
router.post('/:emailId/unread', async (req, res) => {
    try {
        const { emailId } = req.params;
        const folder = req.body.folder || 'INBOX';

        await emailService.markAsUnread(emailId, folder);

        res.json({
            success: true,
            message: 'Email marked as unread'
        });
    } catch (error) {
        console.error('Mark as unread error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 搜索郵件
router.get('/search/:query', async (req, res) => {
    try {
        const { query } = req.params;
        const folder = req.query.folder || 'INBOX';

        const emails = await emailService.searchEmails(query, folder);

        res.json({
            success: true,
            count: emails.length,
            emails: emails
        });
    } catch (error) {
        console.error('Search emails error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 刪除郵件
router.delete('/:emailId', async (req, res) => {
    try {
        const { emailId } = req.params;
        const folder = req.body.folder || 'INBOX';

        await emailService.deleteEmail(emailId, folder);

        res.json({
            success: true,
            message: 'Email deleted successfully'
        });
    } catch (error) {
        console.error('Delete email error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 移動郵件到資料夾
router.post('/:emailId/move', async (req, res) => {
    try {
        const { emailId } = req.params;
        const { fromFolder, toFolder } = req.body;

        if (!toFolder) {
            return res.status(400).json({
                success: false,
                error: 'Missing required field: toFolder'
            });
        }

        await emailService.moveEmail(emailId, fromFolder || 'INBOX', toFolder);

        res.json({
            success: true,
            message: 'Email moved successfully'
        });
    } catch (error) {
        console.error('Move email error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 獲取郵件資料夾列表
router.get('/folders/list', async (req, res) => {
    try {
        const folders = await emailService.listFolders();

        res.json({
            success: true,
            folders: folders
        });
    } catch (error) {
        console.error('List folders error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 測試連接
router.get('/test/connection', async (req, res) => {
    try {
        const result = await emailService.testConnection();

        res.json({
            success: true,
            result: result
        });
    } catch (error) {
        console.error('Test connection error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
