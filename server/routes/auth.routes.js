// ===================================
// 認證 API 路由
// ===================================

const express = require('express');
const router = express.Router();

// OAuth 回調（用於 Microsoft Graph API）
router.get('/callback', async (req, res) => {
    try {
        const { code } = req.query;

        if (!code) {
            return res.status(400).json({
                success: false,
                error: 'Authorization code not provided'
            });
        }

        // 處理 OAuth 回調
        // TODO: 實現 OAuth 流程

        res.json({
            success: true,
            message: 'Authentication successful'
        });
    } catch (error) {
        console.error('Auth callback error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 登出
router.post('/logout', async (req, res) => {
    try {
        // 清除 session 或 token
        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 獲取當前用戶信息
router.get('/me', async (req, res) => {
    try {
        res.json({
            success: true,
            user: {
                email: process.env.EMAIL_USER,
                name: 'User',
                serviceType: process.env.EMAIL_SERVICE_TYPE || 'imap'
            }
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
