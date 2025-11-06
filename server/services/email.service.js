// ===================================
// 郵件服務 - IMAP/SMTP
// ===================================

const Imap = require('imap');
const { simpleParser } = require('mailparser');
const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        this.imapConfig = null;
        this.smtpTransporter = null;
        this.initializeService();
    }

    // 初始化服務
    initializeService() {
        const serviceType = process.env.EMAIL_SERVICE_TYPE || 'demo';

        // 演示模式 - 不需要真實郵件配置
        if (serviceType === 'demo') {
            console.log('📧 演示模式啟用 - 使用模擬郵件數據');
            this.demoMode = true;
            return;
        }

        this.demoMode = false;

        if (serviceType === 'gmail') {
            this.setupGmail();
        } else if (serviceType === 'outlook') {
            this.setupOutlook();
        } else {
            this.setupGenericIMAP();
        }

        this.setupSMTP();
    }

    // Gmail 設定
    setupGmail() {
        this.imapConfig = {
            user: process.env.GMAIL_USER,
            password: process.env.GMAIL_APP_PASSWORD,
            host: 'imap.gmail.com',
            port: 993,
            tls: true,
            tlsOptions: { rejectUnauthorized: false }
        };
    }

    // Outlook 設定
    setupOutlook() {
        this.imapConfig = {
            user: process.env.OUTLOOK_USER || process.env.EMAIL_USER,
            password: process.env.OUTLOOK_PASSWORD || process.env.EMAIL_PASSWORD,
            host: process.env.OUTLOOK_IMAP_HOST || 'outlook.office365.com',
            port: parseInt(process.env.OUTLOOK_IMAP_PORT) || 993,
            tls: true,
            tlsOptions: { rejectUnauthorized: false }
        };
    }

    // 通用 IMAP 設定
    setupGenericIMAP() {
        this.imapConfig = {
            user: process.env.EMAIL_USER,
            password: process.env.EMAIL_PASSWORD,
            host: process.env.IMAP_HOST,
            port: parseInt(process.env.IMAP_PORT) || 993,
            tls: process.env.IMAP_TLS === 'true',
            tlsOptions: { rejectUnauthorized: false }
        };
    }

    // SMTP 設定
    setupSMTP() {
        const serviceType = process.env.EMAIL_SERVICE_TYPE || 'imap';

        let smtpConfig = {};

        if (serviceType === 'gmail') {
            smtpConfig = {
                service: 'gmail',
                auth: {
                    user: process.env.GMAIL_USER,
                    pass: process.env.GMAIL_APP_PASSWORD
                }
            };
        } else if (serviceType === 'outlook') {
            smtpConfig = {
                host: process.env.OUTLOOK_SMTP_HOST || 'smtp-mail.outlook.com',
                port: parseInt(process.env.OUTLOOK_SMTP_PORT) || 587,
                secure: false,
                auth: {
                    user: process.env.OUTLOOK_USER || process.env.EMAIL_USER,
                    pass: process.env.OUTLOOK_PASSWORD || process.env.EMAIL_PASSWORD
                }
            };
        } else {
            smtpConfig = {
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT) || 587,
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASSWORD
                }
            };
        }

        this.smtpTransporter = nodemailer.createTransport(smtpConfig);
    }

    // 獲取郵件列表
    async fetchEmails(options = {}) {
        const {
            folder = 'INBOX',
            limit = 50,
            offset = 0,
            unreadOnly = false,
            since = null
        } = options;

        // 演示模式：返回模擬數據
        if (this.demoMode) {
            return this.getDemoEmails(limit);
        }

        return new Promise((resolve, reject) => {
            const imap = new Imap(this.imapConfig);

            let emails = [];

            imap.once('ready', () => {
                imap.openBox(folder, false, (err, box) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    // 構建搜索條件
                    let searchCriteria = ['ALL'];
                    if (unreadOnly) {
                        searchCriteria = ['UNSEEN'];
                    }
                    if (since) {
                        searchCriteria.push(['SINCE', since]);
                    }

                    imap.search(searchCriteria, (err, results) => {
                        if (err) {
                            reject(err);
                            return;
                        }

                        if (!results || results.length === 0) {
                            imap.end();
                            resolve([]);
                            return;
                        }

                        // 應用分頁
                        const start = Math.max(results.length - offset - limit, 0);
                        const end = results.length - offset;
                        const pagedResults = results.slice(start, end).reverse();

                        const fetch = imap.fetch(pagedResults, {
                            bodies: '',
                            struct: true
                        });

                        fetch.on('message', (msg, seqno) => {
                            let emailData = {
                                id: seqno,
                                seqno: seqno
                            };

                            msg.on('body', (stream, info) => {
                                simpleParser(stream, async (err, parsed) => {
                                    if (err) {
                                        console.error('Parse error:', err);
                                        return;
                                    }

                                    emailData = {
                                        ...emailData,
                                        messageId: parsed.messageId,
                                        from: parsed.from,
                                        to: parsed.to,
                                        subject: parsed.subject,
                                        date: parsed.date,
                                        text: parsed.text,
                                        html: parsed.html,
                                        attachments: parsed.attachments || []
                                    };

                                    emails.push(emailData);
                                });
                            });

                            msg.once('attributes', (attrs) => {
                                emailData.attributes = attrs;
                                emailData.flags = attrs.flags;
                                emailData.uid = attrs.uid;
                            });
                        });

                        fetch.once('error', (err) => {
                            console.error('Fetch error:', err);
                            reject(err);
                        });

                        fetch.once('end', () => {
                            imap.end();
                        });
                    });
                });
            });

            imap.once('error', (err) => {
                console.error('IMAP connection error:', err);
                reject(err);
            });

            imap.once('end', () => {
                // 排序郵件（最新的在前）
                emails.sort((a, b) => new Date(b.date) - new Date(a.date));
                resolve(emails);
            });

            imap.connect();
        });
    }

    // 獲取單個郵件
    async fetchEmailById(emailId, folder = 'INBOX') {
        return new Promise((resolve, reject) => {
            const imap = new Imap(this.imapConfig);

            imap.once('ready', () => {
                imap.openBox(folder, false, (err, box) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    const fetch = imap.fetch([emailId], {
                        bodies: '',
                        struct: true
                    });

                    let emailData = null;

                    fetch.on('message', (msg, seqno) => {
                        msg.on('body', (stream, info) => {
                            simpleParser(stream, async (err, parsed) => {
                                if (err) {
                                    reject(err);
                                    return;
                                }

                                emailData = {
                                    id: seqno,
                                    messageId: parsed.messageId,
                                    from: parsed.from,
                                    to: parsed.to,
                                    cc: parsed.cc,
                                    bcc: parsed.bcc,
                                    subject: parsed.subject,
                                    date: parsed.date,
                                    text: parsed.text,
                                    html: parsed.html,
                                    attachments: parsed.attachments || [],
                                    headers: parsed.headers
                                };
                            });
                        });

                        msg.once('attributes', (attrs) => {
                            if (emailData) {
                                emailData.attributes = attrs;
                                emailData.flags = attrs.flags;
                                emailData.uid = attrs.uid;
                            }
                        });
                    });

                    fetch.once('error', (err) => {
                        reject(err);
                    });

                    fetch.once('end', () => {
                        imap.end();
                    });
                });
            });

            imap.once('error', (err) => {
                reject(err);
            });

            imap.once('end', () => {
                if (emailData) {
                    resolve(emailData);
                } else {
                    reject(new Error('Email not found'));
                }
            });

            imap.connect();
        });
    }

    // 發送郵件
    async sendEmail(emailData) {
        const {
            to,
            cc,
            bcc,
            subject,
            text,
            html,
            attachments = [],
            replyTo = null,
            inReplyTo = null
        } = emailData;

        const mailOptions = {
            from: this.imapConfig.user,
            to,
            cc,
            bcc,
            subject,
            text,
            html,
            attachments,
            replyTo,
            inReplyTo
        };

        try {
            const info = await this.smtpTransporter.sendMail(mailOptions);
            return {
                success: true,
                messageId: info.messageId,
                response: info.response
            };
        } catch (error) {
            console.error('Send email error:', error);
            throw error;
        }
    }

    // 標記郵件為已讀
    async markAsRead(emailId, folder = 'INBOX') {
        return this.updateFlags(emailId, ['\\Seen'], 'add', folder);
    }

    // 標記郵件為未讀
    async markAsUnread(emailId, folder = 'INBOX') {
        return this.updateFlags(emailId, ['\\Seen'], 'remove', folder);
    }

    // 更新郵件標籤
    async updateFlags(emailId, flags, action = 'add', folder = 'INBOX') {
        return new Promise((resolve, reject) => {
            const imap = new Imap(this.imapConfig);

            imap.once('ready', () => {
                imap.openBox(folder, false, (err, box) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    const flagAction = action === 'add' ? 'addFlags' : 'delFlags';

                    imap[flagAction](emailId, flags, (err) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve({ success: true });
                        }
                        imap.end();
                    });
                });
            });

            imap.once('error', (err) => {
                reject(err);
            });

            imap.connect();
        });
    }

    // 搜索郵件
    async searchEmails(query, folder = 'INBOX') {
        return new Promise((resolve, reject) => {
            const imap = new Imap(this.imapConfig);

            imap.once('ready', () => {
                imap.openBox(folder, false, (err, box) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    // 構建搜索條件
                    let searchCriteria = [['SUBJECT', query]];
                    // 也可以搜索發件人、內容等
                    // [['FROM', query], ['SUBJECT', query], ['BODY', query]]

                    imap.search(searchCriteria, (err, results) => {
                        if (err) {
                            reject(err);
                            imap.end();
                            return;
                        }

                        if (!results || results.length === 0) {
                            imap.end();
                            resolve([]);
                            return;
                        }

                        let emails = [];
                        const fetch = imap.fetch(results, {
                            bodies: '',
                            struct: true
                        });

                        fetch.on('message', (msg, seqno) => {
                            let emailData = { id: seqno };

                            msg.on('body', (stream, info) => {
                                simpleParser(stream, async (err, parsed) => {
                                    if (!err) {
                                        emailData = {
                                            ...emailData,
                                            messageId: parsed.messageId,
                                            from: parsed.from,
                                            to: parsed.to,
                                            subject: parsed.subject,
                                            date: parsed.date,
                                            text: parsed.text?.substring(0, 200)
                                        };
                                        emails.push(emailData);
                                    }
                                });
                            });
                        });

                        fetch.once('end', () => {
                            imap.end();
                        });
                    });
                });
            });

            imap.once('end', () => {
                resolve(emails);
            });

            imap.once('error', (err) => {
                reject(err);
            });

            imap.connect();
        });
    }

    // 測試連接
    async testConnection() {
        return new Promise((resolve, reject) => {
            const imap = new Imap(this.imapConfig);

            imap.once('ready', () => {
                console.log('✅ IMAP connection successful');
                imap.end();
                resolve({ imap: true });
            });

            imap.once('error', (err) => {
                console.error('❌ IMAP connection failed:', err.message);
                reject(err);
            });

            imap.once('end', () => {
                // Test SMTP
                this.smtpTransporter.verify()
                    .then(() => {
                        console.log('✅ SMTP connection successful');
                        resolve({ imap: true, smtp: true });
                    })
                    .catch((err) => {
                        console.error('❌ SMTP connection failed:', err.message);
                        resolve({ imap: true, smtp: false, smtpError: err.message });
                    });
            });

            imap.connect();
        });
    }

    // 演示模式：生成模擬郵件
    getDemoEmails(limit = 10) {
        const demoEmails = [
            {
                id: '1',
                messageId: '<demo1@example.com>',
                from: { name: '王小明', address: 'wang@abc-tech.com' },
                to: [{ name: 'Amber', address: 'amber@company.com' }],
                subject: '關於產品報價的討論',
                date: new Date(Date.now() - 2 * 3600000),
                text: '您好 Amber，\n\n我們是 ABC 科技公司的採購部門。最近在市場調查中注意到貴公司的產品線，特別是新推出的智能設備系列，我們非常感興趣。\n\n能否請您提供以下資訊：\n- 產品型號 X100 的詳細規格和報價\n- 大量採購的折扣方案\n- 交貨期和售後服務條款\n\n我們預計採購數量在 500-1000 件之間，預算範圍在 $50,000-$100,000。希望能在本月底前做出採購決定。\n\n期待您的回覆。\n\n謝謝！\n王小明\nABC 科技採購部',
                bodyPreview: '您好，我們對貴公司的產品很感興趣，想了解更詳細的報價資訊...',
                isRead: false
            },
            {
                id: '2',
                messageId: '<demo2@example.com>',
                from: { name: '李美玲', address: 'li@xyz-trade.com' },
                to: [{ name: 'Amber', address: 'amber@company.com' }],
                subject: '物流配送時間確認',
                date: new Date(Date.now() - 24 * 3600000),
                text: '您好，\n\n請確認本批貨物的配送時間，我們這邊需要提前安排倉儲空間。\n\n訂單編號：#XYZ-2024-001\n數量：300 件\n\n這批貨物今日截止確認，麻煩儘快回覆。\n\n謝謝！\n李美玲\nXYZ 貿易物流部',
                bodyPreview: '請確認本批貨物的配送時間，我們這邊需要提前安排...',
                isRead: false
            },
            {
                id: '3',
                messageId: '<demo3@example.com>',
                from: { name: '陳雅婷', address: 'chen@ghi-group.com' },
                to: [{ name: 'Amber', address: 'amber@company.com' }],
                subject: '新產品合作機會',
                date: new Date(Date.now() - 3 * 3600000),
                text: '您好 Amber，\n\n我們是 GHI 集團的採購經理。看到貴公司最近推出的新產品線，我們認為有很好的合作機會。\n\nGHI 集團是業內領先的經銷商，每年採購額超過 $10M。我們想了解：\n- 是否有經銷商合作方案\n- 長期合作的價格優惠\n- 獨家代理的可能性\n\n希望能安排一次會議詳細討論。\n\n期待您的回覆！\n\n陳雅婷\nGHI 集團採購總監',
                bodyPreview: '我們是 GHI 集團的採購經理，看到貴公司的新產品線...',
                isRead: false
            },
            {
                id: '4',
                messageId: '<demo4@example.com>',
                from: { name: '張建國', address: 'zhang@def-corp.com' },
                to: [{ name: 'Amber', address: 'amber@company.com' }],
                subject: '產品技術規格諮詢',
                date: new Date(Date.now() - 5 * 3600000),
                text: '您好，\n\n我們正在評估貴公司的產品是否符合我們的技術需求。\n\n請問 X100 系列是否支持以下規格：\n- 工作溫度範圍 -20°C 至 60°C\n- IP67 防水防塵等級\n- CE 和 FCC 認證\n\n這些是我們採購的基本要求。\n\n謝謝！\n張建國\nDEF 企業技術部',
                bodyPreview: '我們正在評估貴公司的產品是否符合我們的技術需求...',
                isRead: false
            },
            {
                id: '5',
                messageId: '<demo5@example.com>',
                from: { name: '劉經理', address: 'liu@jkl-trading.com' },
                to: [{ name: 'Amber', address: 'amber@company.com' }],
                subject: 'Re: 上月訂單進度',
                date: new Date(Date.now() - 12 * 3600000),
                text: '您好，\n\n上個月的訂單（訂單號 #2024-1015）目前進度如何？客戶那邊一直在催。\n\n請回覆預計交貨時間，謝謝！\n\n劉經理',
                bodyPreview: '上個月的訂單目前進度如何？客戶那邊一直在催...',
                isRead: true
            }
        ];

        return demoEmails.slice(0, limit);
    }

    // 演示模式：發送郵件（模擬）
    async sendEmailDemo(emailData) {
        console.log('📧 演示模式：模擬發送郵件');
        console.log('收件人:', emailData.to);
        console.log('主旨:', emailData.subject);

        return {
            success: true,
            messageId: '<demo-sent-' + Date.now() + '@example.com>',
            response: 'Demo email sent (simulated)'
        };
    }

    // 覆蓋 sendEmail 方法以支持演示模式
    async sendEmail(emailData) {
        if (this.demoMode) {
            return this.sendEmailDemo(emailData);
        }

        return super.sendEmail ? super.sendEmail(emailData) : this.sendEmailReal(emailData);
    }

    async sendEmailReal(emailData) {
        const {
            to,
            cc,
            bcc,
            subject,
            text,
            html,
            attachments = [],
            replyTo = null,
            inReplyTo = null
        } = emailData;

        const mailOptions = {
            from: this.imapConfig.user,
            to,
            cc,
            bcc,
            subject,
            text,
            html,
            attachments,
            replyTo,
            inReplyTo
        };

        try {
            const info = await this.smtpTransporter.sendMail(mailOptions);
            return {
                success: true,
                messageId: info.messageId,
                response: info.response
            };
        } catch (error) {
            console.error('Send email error:', error);
            throw error;
        }
    }
}

module.exports = new EmailService();
