// 1. 使用 import 替换 require
import { OAuth2Client } from 'google-auth-library';

// 建议在 Vercel 的 Environment Variables 中设置此变量
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID ;
console.log('GOOGLE_CLIENT_ID:', CLIENT_ID); // 调试输出，部署后可删除
const client = new OAuth2Client(CLIENT_ID);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { idToken } = req.body;

    if (!idToken) {
        return res.status(400).json({ error: 'Missing token' });
    }

    try {
        // 1. 向 Google 服务器验证 Token 的真实性
        const ticket = await client.verifyIdToken({
            idToken: idToken,
            audience: CLIENT_ID, 
        });

        const payload = ticket.getPayload();
        
        // 2. 提取用户信息
        const user = {
            googleId: payload['sub'], // 用户的唯一谷歌标识
            email: payload['email'],
            name: payload['name'],
            picture: payload['picture']
        };

        // 3. 【此处可扩展】逻辑：
        // 你可以在这里连接 Neon 数据库：
        // const result = await sql`SELECT * FROM users WHERE google_id = ${user.googleId}`;
        // if (result.length === 0) await sql`INSERT INTO users...`;

        // 4. 返回成功响应
        return res.status(200).json({
            success: true,
            user: user
        });

    } catch (error) {
        console.error("验证失败:", error);
        return res.status(401).json({ success: false, error: '身份验证失败' });
    }
}