// 配置文件 - 优先使用环境变量，否则使用默认值
module.exports = {
    BOT_TOKEN: process.env.BOT_TOKEN || '',
    ADMIN_ID: process.env.ADMIN_ID || '',
    TG_API_BASE: process.env.TG_API_BASE || '',

    MAIL: {
        HOST: process.env.MAIL_HOST || 'imap.gmail.com',
        PORT: parseInt(process.env.MAIL_PORT) || 993,
        USER: process.env.MAIL_USER || '',
        PASS: process.env.MAIL_PASS || '',
        DIGEST_TIME: process.env.MAIL_DIGEST_TIME || '08:00',
    },

    DB_PATH: process.env.DB_PATH || './data/bot.db',

    OPENAI: {
        API_BASE: process.env.OPENAI_API_BASE || 'https://api.openai.com/v1',
        API_KEY: process.env.OPENAI_API_KEY || '',
        MODEL: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
    },

    RSS: {
        CHECK_INTERVAL: parseInt(process.env.RSS_CHECK_INTERVAL) || 30,
        KEYWORDS: process.env.RSS_KEYWORDS ? process.env.RSS_KEYWORDS.split(',') : [],
        EXCLUDE: process.env.RSS_EXCLUDE ? process.env.RSS_EXCLUDE.split(',') : [],
    },

    FEATURES: {
        TRANSLATE: process.env.FEATURE_TRANSLATE !== 'false',
        QRCODE: process.env.FEATURE_QRCODE !== 'false',
        SHORTEN: process.env.FEATURE_SHORTEN !== 'false',
        REMIND: process.env.FEATURE_REMIND !== 'false',
        NOTE: process.env.FEATURE_NOTE !== 'false',
        RSS: process.env.FEATURE_RSS !== 'false',
        WEATHER: process.env.FEATURE_WEATHER !== 'false',
        RATE: process.env.FEATURE_RATE !== 'false',
        MAIL: process.env.FEATURE_MAIL === 'true',
        CHAT: process.env.FEATURE_CHAT !== 'false',
    },
};
