import axios from 'axios';
import { getAuthUser } from './lib/jwt.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }


    const apiKey = "p7ef3KUrFPsnbxiJuDni9Zu7fk7pqD9h0CqRzON6wKuTuZU1zNOJA93hrqFrH8hc";
    const apiSecret = "3qwcLKxw0mtUrWes1Q31vGNPtXrYwjDOCwytSpOHUk84XjfX5A10ZHKCDRgbX9qf";

   

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