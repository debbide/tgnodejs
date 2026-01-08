/**
 * 💬 聊天辅助命令
 * 使用 OpenAI 兼容 API 生成回复建议
 */

const { config } = require('../config');

// 系统提示词 - 轻松幽默风格
const SYSTEM_PROMPT = `你是一个聊天回复助手，帮助用户想出合适的回复。

要求：
1. 风格轻松幽默，不要太正式
2. 回复要自然，像朋友间的对话
3. 可以适当使用emoji增加趣味性
4. 给出2-3个不同的回复建议，用数字标注
5. 每个建议简洁有力，不要太长
6. 如果对方的话有歧义，可以给出不同理解下的回复`;

/**
 * 调用 OpenAI 兼容 API
 */
async function callOpenAI(userMessage) {
    const { apiBase, apiKey, model } = config.openai;

    if (!apiKey) {
        throw new Error('请先在 config.js 中配置 OPENAI.API_KEY');
    }

    const response = await fetch(`${apiBase}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: `对方说：「${userMessage}」\n\n请给我一些回复建议：` },
            ],
            temperature: 0.8,
            max_tokens: 500,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`API 请求失败: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '抱歉，没有生成回复';
}

/**
 * 设置聊天命令
 */
function setupChatCommand(bot) {
    // 检查功能是否启用
    if (config.features?.CHAT === false) {
        return;
    }

    // /chat 或 /c 命令
    const handler = async (ctx) => {
        const text = ctx.message.text;
        const match = text.match(/^\/c(?:hat)?\s+(.+)/s);

        if (!match) {
            return ctx.reply(
                '💬 *聊天助手*\n\n' +
                '用法: `/chat <对方说的话>`\n' +
                '示例: `/chat 今天天气不错啊`\n\n' +
                '我会帮你想几个轻松幽默的回复~',
                { parse_mode: 'Markdown' }
            );
        }

        const userInput = match[1].trim();

        try {
            await ctx.sendChatAction('typing');
            const reply = await callOpenAI(userInput);
            await ctx.reply(`💬 *回复建议*\n\n对方说：「${userInput}」\n\n${reply}`, {
                parse_mode: 'Markdown',
            });
        } catch (err) {
            console.error('Chat API error:', err.message);
            await ctx.reply(`❌ 生成失败: ${err.message}`);
        }
    };

    bot.command('chat', handler);
    bot.command('c', handler);
}

module.exports = { setupChatCommand };
