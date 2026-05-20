const { dbAll, dbRun, dbGet } = require('../models/db');
const { logAction } = require('../middleware/auth');

exports.getUsers = async (req, res) => {
    try {
        const users = await dbAll('SELECT admin_id, username, full_name, role, status, created_at FROM Admin ORDER BY created_at DESC');
        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.getPendingUsers = async (req, res) => {
    try {
        const users = await dbAll("SELECT admin_id, username, role, full_name, created_at FROM Admin WHERE status = 'pending' ORDER BY created_at ASC");
        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.approveUser = async (req, res) => {
    const userId = parseInt(req.params.id);

    try {
        const user = await dbGet('SELECT username, role, status FROM Admin WHERE admin_id = ?', [userId]);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (user.status === 'approved') {
            return res.status(400).json({ error: 'User is already approved' });
        }

        await dbRun("UPDATE Admin SET status = 'approved' WHERE admin_id = ?", [userId]);
        await logAction(req.user.userId, 'USER_APPROVED', `Approved user: ${user.username} (${user.role})`, req.ip);

        res.json({ message: `User "${user.username}" berhasil di-approve` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.rejectUser = async (req, res) => {
    const userId = parseInt(req.params.id);

    try {
        const user = await dbGet('SELECT username, role, status FROM Admin WHERE admin_id = ?', [userId]);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (user.status === 'rejected') {
            return res.status(400).json({ error: 'User is already rejected' });
        }

        await dbRun("UPDATE Admin SET status = 'rejected' WHERE admin_id = ?", [userId]);
        await logAction(req.user.userId, 'USER_REJECTED', `Rejected user: ${user.username} (${user.role})`, req.ip);

        res.json({ message: `User "${user.username}" telah ditolak` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.deleteUser = async (req, res) => {
    const userId = parseInt(req.params.id);

    if (userId === req.user.userId) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    try {
        const user = await dbGet('SELECT username FROM Admin WHERE admin_id = ?', [userId]);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        await dbRun('DELETE FROM Admin WHERE admin_id = ?', [userId]);
        await logAction(req.user.userId, 'USER_DELETED', `Deleted user: ${user.username}`, req.ip);

        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.getLogs = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    try {
        const logs = await dbAll(
            'SELECT l.*, a.username FROM audit_log l LEFT JOIN Admin a ON l.user_id = a.admin_id ORDER BY l.timestamp DESC LIMIT ? OFFSET ?',
            [limit, offset]
        );

        const total = await dbGet('SELECT COUNT(*) as count FROM audit_log');

        res.json({
            logs,
            pagination: {
                page,
                limit,
                total: total.count,
                pages: Math.ceil(total.count / limit),
            },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.getSuspicious = async (req, res) => {
    try {
        const products = await dbAll(
            'SELECT product_id, product_name, batch_number, status, created_at FROM Product WHERE is_suspicious = 1 ORDER BY created_at DESC'
        );
        res.json(products);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.getStats = async (req, res) => {
    try {
        const totalProducts = await dbGet('SELECT COUNT(*) as count FROM Product');
        const verifiedCount = await dbGet('SELECT COUNT(DISTINCT product_id) as count FROM Verification_Record');
        const suspiciousCount = await dbGet('SELECT COUNT(*) as count FROM Product WHERE is_suspicious = 1');
        const pendingUsers = await dbGet("SELECT COUNT(*) as count FROM Admin WHERE status = 'pending'");
        const recentLogs = await dbAll(
            'SELECT l.*, a.username FROM audit_log l LEFT JOIN Admin a ON l.user_id = a.admin_id ORDER BY l.timestamp DESC LIMIT 10'
        );

        res.json({
            totalProducts: totalProducts ? totalProducts.count : 0,
            verifiedCount: verifiedCount ? verifiedCount.count : 0,
            suspiciousCount: suspiciousCount ? suspiciousCount.count : 0,
            pendingUsers: pendingUsers ? pendingUsers.count : 0,
            recentLogs,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};
