const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    try {
        // Support Authorization header and fallback to `token` query param
        const headerToken = req.headers.authorization?.split(' ')[1]; // Bearer TOKEN
        const queryToken = req.query?.token;
        const token = headerToken || queryToken;

        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key');
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        next();
    };
};

module.exports = { authMiddleware, requireRole };
