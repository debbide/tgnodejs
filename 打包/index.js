// TG 多功能机器人入口

const express = require('express');
const path = require('path');
const { validateConfig } = require('./src/config');
const { initDatabase } = require('./src/db');
const { bot } = require('./src/bot');
const { initScheduler } = require('./src/services/scheduler.service');
const { initWorker } = require('./src/services/worker.service');

// 创建 HTTP 服务器托管静态页面
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, '0.0.0.0');

// 导入命令模块
const { setupStartCommand, setupHelpCommand } = require('./src/commands/start');
const { setupTranslateCommand } = require('./src/commands/translate');
const { setupQRCodeCommand } = require('./src/commands/qrcode');
const { setupShortenCommand } = require('./src/commands/shorten');
const { setupRemindCommand } = require('./src/commands/remind');
const { setupNoteCommand } = require('./src/commands/note');
const { setupWeatherCommand } = require('./src/commands/weather');
const { setupRateCommand } = require('./src/commands/rate');
const { setupRssCommand } = require('./src/commands/rss');
const { setupIdCommand } = require('./src/commands/id');
const { setupChatCommand } = require('./src/commands/chat');
const { setupTimezoneCommand } = require('./src/commands/timezone');

// 启动重试配置
const MAX_RETRIES = 5;
const RETRY_DELAY = 5000;

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function launchWithRetry(retries = 0) {
    try {
        await bot.launch();
        console.log('✅ Bot 已启动');
    } catch (err) {
        if (retries < MAX_RETRIES) {
            await sleep(RETRY_DELAY);
            return launchWithRetry(retries + 1);
        }
        throw err;
    }
}

async function main() {
    validateConfig();
    initDatabase();

    // 注册命令
    setupStartCommand(bot);
    setupHelpCommand(bot);
    setupTranslateCommand(bot);
    setupQRCodeCommand(bot);
    setupShortenCommand(bot);
    setupRemindCommand(bot);
    setupNoteCommand(bot);
    setupWeatherCommand(bot);
    setupRateCommand(bot);
    setupRssCommand(bot);
    setupIdCommand(bot);
    setupChatCommand(bot);
    setupTimezoneCommand(bot);

    initScheduler(bot);

    // 启动后台服务（静默）
    initWorker().catch(() => { });

    await launchWithRetry();

    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

main().catch((err) => {
    console.error('❌ 启动失败:', err.message);
    process.exit(1);
});
