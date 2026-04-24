import { getAuthUser } from './lib/jwt.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const user = await getAuthUser(req);
    if (!user) {
        return res.status(401).json({ error: '未登录' });
    }

    return res.status(200).json({ success: true, user });
}
