import { neon } from '@neondatabase/serverless';
import axios from 'axios';

export default async function handler(req, res) {
  const sql = neon(process.env.DATABASE_URL);
  const botToken = process.env.BOT_TOKEN;

  if (req.method === 'POST') {
    try {
      const { message } = req.body;
      if (!message || !message.from) return res.status(200).send('ok');

      const tgId = message.from.id;
      const username = message.from.username || 'User';
      const text = message.text;

      let currentUser;
      try {
        const users = await sql`SELECT * FROM users WHERE tg_id = ${tgId}`;

        if (users.length === 0) {
          const result = await sql`
            INSERT INTO users (tg_id, username) 
            VALUES (${tgId}, ${username}) 
            ON CONFLICT (tg_id) DO UPDATE SET username = EXCLUDED.username
            RETURNING *
          `;
          if (!result || result.length === 0) {
            throw new Error('用户创建失败，数据库未返回数据');
          }
          currentUser = result[0];
        } else {
          currentUser = users[0];
        }
      } catch (dbError) {
        console.error('数据库操作失败:', dbError);
        await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          chat_id: tgId,
          text: '连接数据库失败，请稍后再试。'
        });
        return res.status(200).send('ok');
      }

      if (text === '/start') {
        let welcomeText = `未开通会员。`;
        if (currentUser?.is_premium) {
          welcomeText = `您是我们的尊贵会员，会员时间：${currentUser.expire_at}。`;
        }
        await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          chat_id: tgId,
          text: `你好 ${username}，${welcomeText} \n\n🎉 <a href="https://t.me/+1ZMhJoiZ8hc5Yzk9" >会员专属频道</a> 限时免费`
        });
      }

      return res.status(200).json({ status: 'ok' });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: e.message });
    }
  }
  res.status(200).send('大脑升级完毕！');
}
