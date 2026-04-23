import { neon } from '@neondatabase/serverless';
import axios from 'axios';

function escapeHtml(text) {
  if (typeof text !== 'string') return String(text);
  return text
    .replace(/&/g, String.fromCharCode(38) + 'amp;')
    .replace(/</g, String.fromCharCode(38) + 'lt;')
    .replace(/>/g, String.fromCharCode(38) + 'gt;')
    .replace(/"/g, String.fromCharCode(38) + 'quot;');
}

const CHANNEL_ID = '-1003737991092';

export default async function handler(req, res) {
  const sql = neon(process.env.DATABASE_URL);
  const botToken = process.env.BOT_TOKEN;

  if (req.method === 'POST') {
    try {
      // 处理频道加入请求审核
      if (req.body.chat_join_request) {
        const { chat_join_request } = req.body;
        const chatId = String(chat_join_request.chat.id);
        const userId = chat_join_request.from.id;

        // 只处理目标频道的请求
        if (chatId !== CHANNEL_ID) {
          return res.status(200).send('ok');
        }

        let currentUser;
        try {
          const users = await sql`SELECT * FROM users WHERE tg_id = ${userId}`;
          if (users.length === 0) {
            const result = await sql`
              INSERT INTO users (tg_id, username, is_premium, expire_at) 
              VALUES (${userId}, ${chat_join_request.from.username || 'User'}, true, NOW() + INTERVAL '15 days')
              ON CONFLICT (tg_id) DO UPDATE SET username = EXCLUDED.username
              RETURNING *
            `;
            currentUser = result?.[0];
          } else {
            currentUser = users[0];
            if (currentUser.username !== chat_join_request.from.username) {
              await sql`UPDATE users SET username = ${chat_join_request.from.username || 'User'} WHERE tg_id = ${userId}`;
              currentUser.username = chat_join_request.from.username || 'User';
            }
          }
        } catch (dbError) {
          console.error('数据库操作失败:', dbError);
          return res.status(200).send('ok');
        }

        if (currentUser?.is_premium) {
          await axios.post(`https://api.telegram.org/bot${botToken}/approveChatJoinRequest`, {
            chat_id: CHANNEL_ID,
            user_id: userId
          });
        } else {
          await axios.post(`https://api.telegram.org/bot${botToken}/declineChatJoinRequest`, {
            chat_id: CHANNEL_ID,
            user_id: userId
          });
          await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            chat_id: userId,
            text: '您还不是会员，无法加入频道。请发送 /start 了解会员信息。'
          });
        }
        return res.status(200).send('ok');
      }

      // 处理普通消息
      const { message } = req.body;
      if (!message || !message.from) return res.status(200).send('ok');

      const tgId = message.from.id;
      const username = message.from.username || 'User';
      const text = message.text;

      let currentUser;
      let tip = '';
      try {
        const users = await sql`SELECT * FROM users WHERE tg_id = ${tgId}`;

        if (users.length === 0) {
          const result = await sql`
            INSERT INTO users (tg_id, username, is_premium, expire_at) 
            VALUES (${tgId}, ${username}, true, NOW() + INTERVAL '15 days')
            ON CONFLICT (tg_id) DO UPDATE SET username = EXCLUDED.username
            RETURNING *
          `;
          if (!result || result.length === 0) {
            throw new Error('用户创建失败，数据库未返回数据');
          }
          currentUser = result[0];
          tip = '新朋友获得15天的免费会员资格。';
        } else {
          currentUser = users[0];
          if (currentUser.username !== username) {
            await sql`UPDATE users SET username = ${username} WHERE tg_id = ${tgId}`;
            currentUser.username = username;
          }
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
        let welcomeText = '未开通会员。';
        if (currentUser?.is_premium) {
          welcomeText = `您是我们的尊贵会员，会员时间：${escapeHtml(currentUser.expire_at)}。`;
        }
        await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          chat_id: tgId,
          text: `你好 ${escapeHtml(username)}，${welcomeText}\n ${tip}\n\n🎉 <a href="https://t.me/+Gj864gFu88M5Njc1">会员专属频道</a> 限时免费`,
          parse_mode: 'HTML'
        });
      }

      return res.status(200).json({ status: 'ok' });
    } catch (e) {
      console.error(e);
      return res.status(200).send('ok');
    }
  }
  res.status(200).send('大脑升级完毕！');
}
