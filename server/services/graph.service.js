// ===================================
// Microsoft Graph API 服務
// 用於 Outlook / Office 365
// ===================================

const { Client } = require('@microsoft/microsoft-graph-client');
const { ConfidentialClientApplication } = require('@azure/msal-node');

class GraphService {
    constructor() {
        this.msalClient = null;
        this.graphClient = null;
        this.initialize();
    }

    // 初始化 MSAL 和 Graph Client
    initialize() {
        if (!process.env.AZURE_CLIENT_ID || !process.env.AZURE_CLIENT_SECRET) {
            console.warn('⚠️ Microsoft Graph API not configured');
            return;
        }

        const msalConfig = {
            auth: {
                clientId: process.env.AZURE_CLIENT_ID,
                authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
                clientSecret: process.env.AZURE_CLIENT_SECRET
            }
        };

        this.msalClient = new ConfidentialClientApplication(msalConfig);
    }

    // 獲取訪問令牌
    async getAccessToken(userId = null) {
        if (!this.msalClient) {
            throw new Error('Microsoft Graph API not configured');
        }

        try {
            const tokenRequest = {
                scopes: ['https://graph.microsoft.com/.default']
            };

            const response = await this.msalClient.acquireTokenByClientCredential(tokenRequest);
            return response.accessToken;
        } catch (error) {
            console.error('Get access token error:', error);
            throw error;
        }
    }

    // 初始化 Graph Client
    async initGraphClient(accessToken) {
        this.graphClient = Client.init({
            authProvider: (done) => {
                done(null, accessToken);
            }
        });
    }

    // 獲取郵件列表
    async fetchEmails(options = {}) {
        const {
            folder = 'inbox',
            limit = 50,
            offset = 0,
            unreadOnly = false,
            orderBy = 'receivedDateTime DESC'
        } = options;

        try {
            const accessToken = await this.getAccessToken();
            await this.initGraphClient(accessToken);

            let query = `/me/mailFolders/${folder}/messages`;
            const queryParams = [
                `$top=${limit}`,
                `$skip=${offset}`,
                `$orderby=${orderBy}`,
                `$select=id,subject,from,toRecipients,receivedDateTime,bodyPreview,body,isRead,hasAttachments,importance`
            ];

            if (unreadOnly) {
                queryParams.push(`$filter=isRead eq false`);
            }

            query += '?' + queryParams.join('&');

            const result = await this.graphClient.api(query).get();

            return result.value.map(email => this.formatEmail(email));
        } catch (error) {
            console.error('Fetch emails error:', error);
            throw error;
        }
    }

    // 獲取單個郵件
    async fetchEmailById(emailId) {
        try {
            const accessToken = await this.getAccessToken();
            await this.initGraphClient(accessToken);

            const email = await this.graphClient
                .api(`/me/messages/${emailId}`)
                .select('id,subject,from,toRecipients,ccRecipients,bccRecipients,receivedDateTime,body,bodyPreview,isRead,hasAttachments,importance,internetMessageHeaders')
                .get();

            return this.formatEmail(email);
        } catch (error) {
            console.error('Fetch email error:', error);
            throw error;
        }
    }

    // 發送郵件
    async sendEmail(emailData) {
        const {
            to,
            cc,
            bcc,
            subject,
            body,
            bodyType = 'HTML',
            importance = 'normal',
            attachments = []
        } = emailData;

        try {
            const accessToken = await this.getAccessToken();
            await this.initGraphClient(accessToken);

            const message = {
                subject,
                body: {
                    contentType: bodyType,
                    content: body
                },
                toRecipients: this.formatRecipients(to),
                importance
            };

            if (cc) {
                message.ccRecipients = this.formatRecipients(cc);
            }

            if (bcc) {
                message.bccRecipients = this.formatRecipients(bcc);
            }

            if (attachments.length > 0) {
                message.attachments = attachments;
            }

            await this.graphClient
                .api('/me/sendMail')
                .post({ message });

            return {
                success: true,
                message: 'Email sent successfully'
            };
        } catch (error) {
            console.error('Send email error:', error);
            throw error;
        }
    }

    // 標記為已讀
    async markAsRead(emailId) {
        return this.updateEmail(emailId, { isRead: true });
    }

    // 標記為未讀
    async markAsUnread(emailId) {
        return this.updateEmail(emailId, { isRead: false });
    }

    // 更新郵件
    async updateEmail(emailId, updates) {
        try {
            const accessToken = await this.getAccessToken();
            await this.initGraphClient(accessToken);

            await this.graphClient
                .api(`/me/messages/${emailId}`)
                .patch(updates);

            return { success: true };
        } catch (error) {
            console.error('Update email error:', error);
            throw error;
        }
    }

    // 搜索郵件
    async searchEmails(query) {
        try {
            const accessToken = await this.getAccessToken();
            await this.initGraphClient(accessToken);

            const result = await this.graphClient
                .api('/me/messages')
                .filter(`contains(subject,'${query}') or contains(from/emailAddress/name,'${query}')`)
                .top(50)
                .orderby('receivedDateTime DESC')
                .select('id,subject,from,receivedDateTime,bodyPreview,isRead')
                .get();

            return result.value.map(email => this.formatEmail(email));
        } catch (error) {
            console.error('Search emails error:', error);
            throw error;
        }
    }

    // 獲取郵件夾列表
    async getFolders() {
        try {
            const accessToken = await this.getAccessToken();
            await this.initGraphClient(accessToken);

            const result = await this.graphClient
                .api('/me/mailFolders')
                .get();

            return result.value;
        } catch (error) {
            console.error('Get folders error:', error);
            throw error;
        }
    }

    // 格式化郵件數據
    formatEmail(email) {
        return {
            id: email.id,
            messageId: email.internetMessageId,
            subject: email.subject,
            from: email.from?.emailAddress,
            to: email.toRecipients?.map(r => r.emailAddress),
            cc: email.ccRecipients?.map(r => r.emailAddress),
            bcc: email.bccRecipients?.map(r => r.emailAddress),
            date: email.receivedDateTime,
            body: email.body?.content,
            bodyPreview: email.bodyPreview,
            bodyType: email.body?.contentType,
            isRead: email.isRead,
            hasAttachments: email.hasAttachments,
            importance: email.importance,
            headers: email.internetMessageHeaders
        };
    }

    // 格式化收件人
    formatRecipients(recipients) {
        if (typeof recipients === 'string') {
            return [{ emailAddress: { address: recipients } }];
        }
        if (Array.isArray(recipients)) {
            return recipients.map(r => ({
                emailAddress: { address: typeof r === 'string' ? r : r.address }
            }));
        }
        return [];
    }

    // 測試連接
    async testConnection() {
        try {
            const accessToken = await this.getAccessToken();
            await this.initGraphClient(accessToken);

            await this.graphClient.api('/me').get();

            console.log('✅ Microsoft Graph API connection successful');
            return { success: true };
        } catch (error) {
            console.error('❌ Microsoft Graph API connection failed:', error.message);
            throw error;
        }
    }
}

module.exports = new GraphService();
