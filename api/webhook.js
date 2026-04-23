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

      const users = await sql`SELECT * FROM users WHERE tg_id = ${tgId}`;

      let currentUser;
      if (users.length === 0) {
        const result = await sql`INSERT INTO users (tg_id, username) VALUES (${tgId}, ${username}) RETURNING *`;
        currentUser = result[0];
      } else {
        currentUser = users[0];
      }

      if (text === '/start') {
        await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          chat_id: tgId,
          text: `你好 ${username}，数据库已连通,你的id是 ${currentUser.id}！`
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
