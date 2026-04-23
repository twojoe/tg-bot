const { createClient } = require('@neondatabase/serverless'); // 假设你用的是 Neon
const { Bot } = require('grammy'); // 或你使用的其他库

const bot = new Bot(process.env.BOT_TOKEN);
const sql = createClient(process.env.DATABASE_URL);

export default async function handler(req, res) {
  // 安全校验：防止别人恶意调用你的接口执行踢人操作
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).end('Unauthorized');
  }

  try {
    // 1. 从数据库找出已过期且仍在该频道的人
    const users = await sql`
      SELECT tg_id FROM users 
      WHERE expire_at < NOW() AND is_premium = TRUE
    `;

    for (const user of users) {
      try {
        // 2. 调用电报 API 踢人 (ban 后立即 unban 相当于踢出)
        await bot.api.banChatMember(process.env.CHANNEL_ID, user.tg_id);
        await bot.api.unbanChatMember(process.env.CHANNEL_ID, user.tg_id);

        // 3. 更新数据库状态
        await sql`UPDATE users SET is_premium = FALSE WHERE tg_id = ${user.tg_id}`;
        
        console.log(`已移除过期用户: ${user.tg_id}`);
      } catch (err) {
        console.error(`踢除用户 ${user.tg_id} 失败:`, err);
      }
    }

    res.status(200).json({ success: true, kickedCount: users.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}