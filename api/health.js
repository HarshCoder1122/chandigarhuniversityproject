export default function handler(req, res) {
    res.status(200).json({
        success: true,
        message: 'Hardini API is running on Vercel!',
        timestamp: new Date().toISOString(),
        platform: 'vercel'
    });
}
