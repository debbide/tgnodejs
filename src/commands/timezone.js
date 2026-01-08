const { timezoneDb } = require('../db');

// 常用时区列表
const COMMON_TIMEZONES = [
    'Asia/Shanghai',      // 北京/上海 UTC+8
    'Asia/Hong_Kong',     // 香港 UTC+8
    'Asia/Taipei',        // 台北 UTC+8
    'Asia/Tokyo',         // 东京 UTC+9
    'Asia/Seoul',         // 首尔 UTC+9
    'Asia/Singapore',     // 新加坡 UTC+8
    'Europe/London',      // 伦敦 UTC+0/+1
    'Europe/Paris',       // 巴黎 UTC+1/+2
    'America/New_York',   // 纽约 UTC-5/-4
    'America/Los_Angeles', // 洛杉矶 UTC-8/-7
    'UTC',                // 协调世界时
];

// 验证时区是否有效
function isValidTimezone(tz) {
    try {
        Intl.DateTimeFormat(undefined, { timeZone: tz });
        return true;
    } catch (e) {
        return false;
    }
}

// 获取时区当前时间
function getTimeInTimezone(timezone) {
    return new Date().toLocaleString('zh-CN', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
}

function setupTimezoneCommand(bot) {
    // /settimezone <时区> - 设置用户时区
    bot.command('settimezone', (ctx) => {
        const tz = ctx.message.text.split(' ').slice(1).join(' ').trim();

        if (!tz) {
            const list = COMMON_TIMEZONES.map(t => `• \`${t}\``).join('\n');
            return ctx.reply(
                `*设置时区*\n\n` +
                `用法: /settimezone <时区>\n\n` +
                `常用时区:\n${list}\n\n` +
                `示例: \`/settimezone Asia/Shanghai\``,
                { parse_mode: 'Markdown' }
            );
        }

        if (!isValidTimezone(tz)) {
            return ctx.reply(`❌ 无效的时区: ${tz}\n\n使用 /settimezone 查看可用时区`);
        }

        timezoneDb.set(ctx.from.id.toString(), tz);
        const currentTime = getTimeInTimezone(tz);

        ctx.reply(
            `✅ 时区已设置为: \`${tz}\`\n\n` +
            `当前时间: ${currentTime}`,
            { parse_mode: 'Markdown' }
        );
    });

    // /mytimezone - 查看当前时区设置
    bot.command('mytimezone', (ctx) => {
        const tz = timezoneDb.get(ctx.from.id.toString());
        const currentTime = getTimeInTimezone(tz);

        ctx.reply(
            `🕐 *你的时区设置*\n\n` +
            `时区: \`${tz}\`\n` +
            `当前时间: ${currentTime}\n\n` +
            `使用 /settimezone 修改`,
            { parse_mode: 'Markdown' }
        );
    });
}

module.exports = { setupTimezoneCommand, isValidTimezone, getTimeInTimezone, COMMON_TIMEZONES };
