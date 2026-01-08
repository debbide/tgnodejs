const helpText = `
🤖 <b>TG 多功能机器人</b>

📋 <b>可用命令：</b>

🌐 <b>翻译</b>
<code>/tr 文本</code> - 翻译到中文
<code>/tr en 文本</code> - 翻译到指定语言

🔗 <b>链接工具</b>
<code>/short URL</code> - 生成短链接
<code>/qr 内容</code> - 生成二维码

⏰ <b>提醒</b>
<code>/remind 10:00 开会</code> - 定时提醒
<code>/remind 30m 休息</code> - 倒计时提醒
<code>/reminders</code> - 查看待办
<code>/delremind ID</code> - 删除提醒
<code>/settimezone</code> - 设置时区
<code>/mytimezone</code> - 查看时区

📝 <b>备忘录</b>
<code>/note 内容</code> - 添加备忘
<code>/notes</code> - 查看列表
<code>/delnote ID</code> - 删除备忘

📰 <b>RSS 订阅</b>
<code>/rss add URL</code> - 添加订阅
<code>/rss list</code> - 查看订阅
<code>/rss del ID</code> - 删除订阅
<code>/rss interval 分钟</code> - 检查间隔
<code>/rss kw add 词1,词2</code> - 添加关键词
<code>/rss ex add 词1,词2</code> - 添加排除词

🌤️ <b>其他</b>
<code>/weather 城市</code> - 查询天气
<code>/rate USD CNY 100</code> - 汇率换算
<code>/id</code> - 获取用户/群组 ID
`;

function setupStartCommand(bot) {
    bot.command('start', (ctx) => {
        ctx.reply(
            `👋 你好，${ctx.from.first_name}！\n\n我是你的多功能助手机器人，可以帮你：\n\n` +
            `• 🌐 快速翻译\n• 🔗 短链接和二维码\n• ⏰ 定时提醒\n• 📝 临时备忘\n• 📰 RSS 订阅\n\n` +
            `发送 /help 查看完整命令列表`,
            { parse_mode: 'HTML' }
        );
    });
}

function setupHelpCommand(bot) {
    bot.command('help', (ctx) => {
        ctx.reply(helpText, { parse_mode: 'HTML' });
    });
}

module.exports = { setupStartCommand, setupHelpCommand };
