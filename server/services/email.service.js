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
        const serviceType = process.env.EMAIL_SERVICE_TYPE || 'imap';

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
}

module.exports = new EmailService();
