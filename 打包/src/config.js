const settings = require('../config');

const config = {
    botToken: settings.BOT_TOKEN,
    adminId: settings.ADMIN_ID ? parseInt(settings.ADMIN_ID) : null,
    apiBase: settings.TG_API_BASE || '',

    mail: {
        host: settings.MAIL.HOST,
        port: settings.MAIL.PORT,
        user: settings.MAIL.USER,
        pass: settings.MAIL.PASS,
        digestTime: settings.MAIL.DIGEST_TIME,
    },

    dbPath: settings.DB_PATH,

    rss: {
        checkInterval: settings.RSS?.CHECK_INTERVAL || 30,
        keywords: settings.RSS?.KEYWORDS || [],
        exclude: settings.RSS?.EXCLUDE || [],
    },

    openai: {
        apiBase: settings.OPENAI?.API_BASE || 'https://api.openai.com/v1',
        apiKey: settings.OPENAI?.API_KEY || '',
        model: settings.OPENAI?.MODEL || 'gpt-3.5-turbo',
    },

    features: settings.FEATURES,
};

function validateConfig() {
    if (!config.botToken || config.botToken === 'your_bot_token_here') {
        throw new Error('请在 config.js 中配置 BOT_TOKEN');
    }
    return true;
}

module.exports = { config, validateConfig };
