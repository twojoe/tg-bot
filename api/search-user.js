import { neon } from '@neondatabase/serverless';
import { getAuthUser } from './lib/jwt.js';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const user = await getAuthUser(req);
    if (!user) {
        return res.status(401).json({ error: '未登录' });
    }

    const { q } = req.query;
    if (!q || q.trim() === '') {
        return res.status(400).json({ error: '缺少搜索关键词' });
    }

    try {
        const keyword = `%${q.trim()}%`;
        const users = await sql`
            SELECT tg_id, username, is_premium, expire_at
            FROM users
            WHERE username ILIKE ${keyword}
            ORDER BY expire_at DESC
            LIMIT 50
        `;
        return res.status(200).json({ success: true, users });
    } catch (error) {
        console.error('搜索用户失败:', error);
        return res.status(500).json({ error: '搜索失败' });
    }
}
