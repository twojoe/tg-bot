import { neon } from '@neondatabase/serverless';
import { getAuthUser } from './lib/jwt.js';

const sql = neon(process.env.DATABASE_URL);

const DURATION_MAP = {
    '1month': { label: '一月', months: 1 },
    '3months': { label: '一季', months: 3 },
    '1year': { label: '一年', months: 12 }
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const user = await getAuthUser(req);
    if (!user) {
        return res.status(401).json({ error: '未登录' });
    }

    const { tg_id, duration } = req.body;
    if (!tg_id || !DURATION_MAP[duration]) {
        return res.status(400).json({ error: '参数错误' });
    }

    try {
        // 查出当前用户信息
        const existing = await sql`SELECT username, expire_at FROM users WHERE tg_id = ${tg_id}`;
        if (existing.length === 0) {
            return res.status(404).json({ error: '用户不存在' });
        }

        const record = existing[0];
        const now = new Date();
        const currentExpire = record.expire_at ? new Date(record.expire_at) : null;
        const baseDate = (!currentExpire || currentExpire < now) ? now : currentExpire;

        // 计算新过期时间
        baseDate.setMonth(baseDate.getMonth() + DURATION_MAP[duration].months);
        const newExpire = baseDate.toISOString();

        await sql`UPDATE users SET is_premium = TRUE, expire_at = ${newExpire} WHERE tg_id = ${tg_id}`;

        const updated = await sql`SELECT tg_id, username, is_premium, expire_at FROM users WHERE tg_id = ${tg_id}`;

        return res.status(200).json({
            success: true,
            message: `已为 ${updated[0].username || tg_id} 开通 ${DURATION_MAP[duration].label} 会员`,
            user: updated[0]
        });
    } catch (error) {
        console.error('开通会员失败:', error);
        return res.status(500).json({ error: '开通会员失败' });
    }
}
