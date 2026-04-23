import { neon } from '@neondatabase/serverless';
import axios from 'axios';

const sql = neon(process.env.DATABASE_URL);
const CHANNEL_ID = '-1003737991092';
const is_check=process.env.IS_CHECK === 'true';
const adminId = 6333025634; // 替换为你的 Telegram I


export default async function handler(req, res) {
  console.log('is_check:', process.env.IS_CHECK); 
  if (!is_check) {
    console.log('过期检查已关闭');
    return res.status(200).end('过期检查已关闭');;
  }
  // 安全校验：防止别人恶意调用你的接口执行踢人操作
  const authHeader = req.headers['authorization'];
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
      if (user.tg_id === adminId) {
        console.log(`跳过管理员: ${user.tg_id}`);
        continue; // 跳过管理员
      }
      try {
        // 2. 调用电报 API 踢人 (ban 后立即 unban 相当于踢出)
        await axios.post(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/banChatMember`, {
          chat_id: CHANNEL_ID,
          user_id: user.tg_id
        });
        await axios.post(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/unbanChatMember`, {
          chat_id: CHANNEL_ID,
          user_id: user.tg_id
        });

        // 3. 更新数据库状态
        await sql`UPDATE users SET is_premium = FALSE WHERE tg_id = ${user.tg_id}`;
        
        console.log(`已移除过期用户: ${user.tg_id}`);
      } catch (err) {
        console.error(`踢除用户 ${user.tg_id} 失败:`, err.response?.data || err.message);
      }
    }

    res.status(200).json({ success: true, kickedCount: users.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
