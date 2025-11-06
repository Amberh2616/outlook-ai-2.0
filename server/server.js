// ===================================
// Outlook AI - 後端服務器
// ===================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const emailRoutes = require('./routes/email.routes');
const authRoutes = require('./routes/auth.routes');
const aiRoutes = require('./routes/ai.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// ===================================
// 中介軟體
// ===================================
app.use(helmet()); // 安全標頭
app.use(compression()); // 壓縮回應
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan('dev')); // 請求日誌

// 提供靜態文件
app.use(express.static('public'));
app.use(express.static('.'));

// ===================================
// API 路由
// ===================================
app.use('/api/auth', authRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/ai', aiRoutes);

// 健康檢查
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'Outlook AI Backend',
        version: '1.0.0'
    });
});

// 根路由
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/../index.html');
});

// ===================================
// 錯誤處理
// ===================================
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: {
            message: err.message || 'Internal Server Error',
            status: err.status || 500
        }
    });
});

// 404 處理
app.use((req, res) => {
    res.status(404).json({
        error: {
            message: 'Route not found',
            status: 404
        }
    });
});

// ===================================
// 啟動服務器
// ===================================
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
    console.log('========================================');
    console.log('🚀 Outlook AI Backend Server Started');
    console.log('========================================');
    console.log(`📍 Server: http://localhost:${PORT}`);
    console.log(`📍 Server: http://21.0.0.30:${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📧 Email Service: ${process.env.EMAIL_SERVICE_TYPE || 'Not configured'}`);
    console.log(`🎯 Listening on: ${HOST}:${PORT}`);
    console.log('========================================');
});

// 優雅關閉
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
    });
});
