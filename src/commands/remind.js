const { reminderDb, timezoneDb } = require('../db');

// 在指定时区获取当前时间的各个部分
function getNowInTimezone(timezone) {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const get = (type) => parseInt(parts.find(p => p.type === type)?.value || '0');
    return {
        year: get('year'),
        month: get('month'),
        day: get('day'),
        hour: get('hour'),
        minute: get('minute'),
        timestamp: now.getTime(),
    };
}

// 将用户时区的时间转换为 UTC 时间戳
function timezoneToTimestamp(year, month, day, hour, minute, timezone) {
    // 构造 ISO 格式字符串
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;

    // 获取该时区的偏移量
    const testDate = new Date(dateStr + 'Z'); // 先当作 UTC
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });

    // 通过二分查找找到正确的 UTC 时间
    let low = testDate.getTime() - 24 * 60 * 60 * 1000;
    let high = testDate.getTime() + 24 * 60 * 60 * 1000;

    while (high - low > 60000) { // 精确到分钟
        const mid = Math.floor((low + high) / 2);
        const midDate = new Date(mid);
        const parts = formatter.formatToParts(midDate);
        const get = (type) => parseInt(parts.find(p => p.type === type)?.value || '0');

        const midYear = get('year');
        const midMonth = get('month');
        const midDay = get('day');
        const midHour = get('hour');
        const midMinute = get('minute');

        const targetVal = year * 100000000 + month * 1000000 + day * 10000 + hour * 100 + minute;
        const midVal = midYear * 100000000 + midMonth * 1000000 + midDay * 10000 + midHour * 100 + midMinute;

        if (midVal < targetVal) {
            low = mid;
        } else {
            high = mid;
        }
    }

    return new Date(Math.floor((low + high) / 2));
}

// 解析时间字符串（考虑用户时区）
function parseTimeString(timeStr, timezone = 'Asia/Shanghai') {
    const nowInfo = getNowInTimezone(timezone);
    const now = new Date();

    // 相对时间格式: 30m, 2h, 1d（不受时区影响）
    const relativeMatch = timeStr.match(/^(\d+)([mhd])$/i);
    if (relativeMatch) {
        const value = parseInt(relativeMatch[1]);
        const unit = relativeMatch[2].toLowerCase();
        const ms = {
            m: 60 * 1000,
            h: 60 * 60 * 1000,
            d: 24 * 60 * 60 * 1000,
        };
        return new Date(now.getTime() + value * ms[unit]);
    }

    // 绝对时间格式: HH:MM（使用用户时区）
    const absoluteMatch = timeStr.match(/^(\d{1,2}):(\d{2})$/);
    if (absoluteMatch) {
        const hour = parseInt(absoluteMatch[1]);
        const minute = parseInt(absoluteMatch[2]);

        let targetDay = nowInfo.day;
        let targetMonth = nowInfo.month;
        let targetYear = nowInfo.year;

        // 如果时间已过，设为明天
        if (hour < nowInfo.hour || (hour === nowInfo.hour && minute <= nowInfo.minute)) {
            const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            const tomorrowInfo = getNowInTimezone(timezone);
            // 简单处理：加一天
            const tempDate = new Date(targetYear, targetMonth - 1, targetDay + 1);
            targetYear = tempDate.getFullYear();
            targetMonth = tempDate.getMonth() + 1;
            targetDay = tempDate.getDate();
        }

        return timezoneToTimestamp(targetYear, targetMonth, targetDay, hour, minute, timezone);
    }

    // 日期时间格式: MM-DD HH:MM 或 YYYY-MM-DD HH:MM（使用用户时区）
    const dateTimeMatch = timeStr.match(/^(?:(\d{4})-)?(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{2})$/);
    if (dateTimeMatch) {
        const year = dateTimeMatch[1] ? parseInt(dateTimeMatch[1]) : nowInfo.year;
        const month = parseInt(dateTimeMatch[2]);
        const day = parseInt(dateTimeMatch[3]);
        const hour = parseInt(dateTimeMatch[4]);
        const minute = parseInt(dateTimeMatch[5]);

        return timezoneToTimestamp(year, month, day, hour, minute, timezone);
    }

    return null;
}

function setupRemindCommand(bot) {
    // /remind <时间> <内容>
    bot.command('remind', (ctx) => {
        const args = ctx.message.text.split(' ').slice(1);

        if (args.length < 2) {
            return ctx.reply(
                '❌ 用法: /remind <时间> <内容>\n\n' +
                '📅 时间格式:\n' +
                '• 30m - 30分钟后\n' +
                '• 2h - 2小时后\n' +
                '• 1d - 1天后\n' +
                '• 10:00 - 今天(或明天)10:00\n' +
                '• 12-25 10:00 - 12月25日10:00\n\n' +
                '💡 使用 /settimezone 设置你的时区'
            );
        }

        const userId = ctx.from.id.toString();
        const userTimezone = timezoneDb.get(userId);
        const timeStr = args[0];
        const message = args.slice(1).join(' ');
        const remindAt = parseTimeString(timeStr, userTimezone);

        if (!remindAt) {
            return ctx.reply('❌ 无法识别时间格式，请参考 /remind 帮助');
        }

        if (remindAt <= new Date()) {
            return ctx.reply('❌ 提醒时间必须在未来');
        }

        const result = reminderDb.add(
            userId,
            ctx.chat.id.toString(),
            message,
            Math.floor(remindAt.getTime() / 1000)
        );

        const timeDisplay = remindAt.toLocaleString('zh-CN', {
            timeZone: userTimezone,
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });

        ctx.reply(
            `✅ 提醒已设置\n\n` +
            `📅 时间: ${timeDisplay}\n` +
            `📝 内容: ${message}\n` +
            `🔖 ID: ${result.lastInsertRowid}\n` +
            `🕐 时区: ${userTimezone}`
        );
    });

    // 查看提醒列表
    bot.command('reminders', (ctx) => {
        const userId = ctx.from.id.toString();
        const userTimezone = timezoneDb.get(userId);
        const reminders = reminderDb.listByUser(userId);

        if (reminders.length === 0) {
            return ctx.reply('📭 暂无待办提醒');
        }

        const list = reminders.map((r) => {
            const time = new Date(r.remind_at * 1000).toLocaleString('zh-CN', {
                timeZone: userTimezone,
                month: 'numeric',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
            return `🔖 #${r.id} | ${time}\n   ${r.message}`;
        }).join('\n\n');

        ctx.reply(`⏰ *待办提醒*\n\n${list}\n\n使用 /delremind <ID> 删除`, { parse_mode: 'Markdown' });
    });

    // 删除提醒
    bot.command('delremind', (ctx) => {
        const id = parseInt(ctx.message.text.split(' ')[1]);

        if (!id) {
            return ctx.reply('❌ 用法: /delremind <ID>');
        }

        const result = reminderDb.delete(id, ctx.from.id.toString());

        if (result.changes > 0) {
            ctx.reply(`✅ 提醒 #${id} 已删除`);
        } else {
            ctx.reply(`❌ 未找到提醒 #${id}`);
        }
    });
}

module.exports = { setupRemindCommand, parseTimeString };
