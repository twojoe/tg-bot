
const { neon } = require('@neondatabase/serverless');
const axios = require('axios');

export default async function handler(req, res) {
  // 1. 初始化数据库连接（使用你存好的环境变量）
  const sql = neon(process.env.DATABASE_URL);
  const botToken = process.env.BOT_TOKEN;

  if (req.method === 'POST') {
    try {
      const { message } = req.body;

      // 如果没有消息内容，直接跳过
      if (!message || !message.from) {
        return res.status(200).send('ok');
      }

      const tgId = message.from.id;
      const username = message.from.username || 'User';
      const text = message.text;

      // 2. 在数据库中查找用户
      const users = await sql`SELECT * FROM users WHERE tg_id = ${tgId}`;

      let currentUser;

      if (users.length === 0) {
        // 3. 【自动注册】如果是第一次使用，存入数据库
        const result = await sql`
          INSERT INTO users (tg_id, username, is_premium)
          VALUES (${tgId}, ${username}, false)
          RETURNING *;
        `;
        currentUser = result[0];
        console.log("新用户注册成功:", tgId);
      } else {
        currentUser = users[0];
      }

      // 4. 简单的机器人逻辑回复
      if (text === '/start') {
        const welcomeText = currentUser.is_premium 
          ? `尊贵的 ${username}，欢迎回来！您的会员身份已激活。` 
          : `你好 ${username}！你当前是免费用户。`;

        await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          chat_id: tgId,
          text: welcomeText
        });
      }

      return res.status(200).json({ status: 'success' });
    } catch (error) {
      console.error('发生错误:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  // 如果有人在浏览器访问，显示这个
  res.status(200).send('机器人大脑正在运行中...');
}
