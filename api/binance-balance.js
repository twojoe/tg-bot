import axios from 'axios';
import { getAuthUser } from './lib/jwt.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const user = await getAuthUser(req);
    if (!user) {
        return res.status(401).json({ error: '未登录' });
    }

    const apiKey = user.binanceApiKey;
    const apiSecret = user.binanceApiSecret;

    if (!apiKey || !apiSecret) {
        return res.status(400).json({ error: '请先配置币安API Key和Secret' });
    }

    try {
        const timestamp = Date.now();
        const queryString = `timestamp=${timestamp}`;
        const signature = await generateSignature(queryString, apiSecret);

        const response = await axios.get(`https://api.binance.com/api/v3/account?${queryString}&signature=${signature}`, {
            headers: {
                'X-MBX-APIKEY': apiKey,
                'Content-Type': 'application/json'
            }
        });

        const balances = response.data.balances.filter(b => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0);

        return res.status(200).json({ success: true, balances });
    } catch (error) {
        console.error('Binance API Error:', error.response?.data || error.message);
        return res.status(500).json({ error: '获取余额失败', details: error.response?.data?.msg || error.message });
    }
}

async function generateSignature(queryString, apiSecret) {
    const crypto = await import('crypto');
    return crypto.createHmac('sha256', apiSecret).update(queryString).digest('hex');
}