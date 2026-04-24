import { OAuth2Client } from 'google-auth-library';
import { signToken } from './lib/jwt.js';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const client = new OAuth2Client(CLIENT_ID);
const admin_id = process.env.ADMIN_GOOGLE_ID;

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { idToken } = req.body;

    if (!idToken) {
        return res.status(400).json({ error: 'Missing token' });
    }

    try {
        const ticket = await client.verifyIdToken({
            idToken: idToken,
            audience: CLIENT_ID,
        });

        const payload = ticket.getPayload();

        const user = {
            googleId: payload['sub'],
            email: payload['email'],
            name: payload['name'],
            picture: payload['picture']
        };

        if (user.googleId !== admin_id) {
            return res.status(403).json({ success: false, error: '无权限访问，你不是管理员。' });
        }

        // 签发 JWT 并写入 httpOnly Cookie
        const token = await signToken(user);
        res.setHeader('Set-Cookie', `auth_token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400`);

        return res.status(200).json({
            success: true,
            user: user
        });

    } catch (error) {
        console.error("验证失败:", error);
        return res.status(401).json({ success: false, error: '身份验证失败' });
    }
}
