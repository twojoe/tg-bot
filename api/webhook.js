export default function handler(req, res) {
  if (req.method === 'POST') {
    const { message } = req.body;
    console.log("收到消息:", message);
    return res.status(200).json({ status: 'ok', text: '已收到消息' });
  }
  
  return res.status(200).send('Hello! 这是一个 Telegram Bot 接口');
}
