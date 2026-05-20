const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { dbRun, dbGet } = require('../models/db');
const { logAction } = require('../middleware/auth');

exports.login = async (req, res) => {
    const { username, password } = req.body;
    const ip = req.ip;

    try {
        const user = await dbGet('SELECT * FROM Admin WHERE username = ?', [username]);

        if (!user || !bcrypt.compareSync(password, user.password)) {
            await logAction(null, 'LOGIN_FAILED', `Failed login attempt for: ${username}`, ip);
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Check account status
        if (user.status === 'pending') {
            await logAction(user.admin_id, 'LOGIN_BLOCKED', `Pending account login attempt: ${username}`, ip);
            return res.status(403).json({ error: 'Akun Anda masih menunggu persetujuan admin. Silakan tunggu.' });
        }
        if (user.status === 'rejected') {
            await logAction(user.admin_id, 'LOGIN_BLOCKED', `Rejected account login attempt: ${username}`, ip);
            return res.status(403).json({ error: 'Akun Anda telah ditolak oleh admin.' });
        }

        const token = jwt.sign(
            { userId: user.admin_id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        await logAction(user.admin_id, 'LOGIN_SUCCESS', `User ${username} logged in`, ip);

        res.json({
            token,
            user: {
                userId: user.admin_id,
                username: user.username,
                role: user.role,
                fullName: user.full_name
            },
        });
    } catch (err) {
        console.error(err);
        await logAction(null, 'SYSTEM_ERROR', err.message, ip);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.registerPublic = async (req, res) => {
    const { username, password, role, full_name } = req.body;
    const ip = req.ip;

    try {
        const existing = await dbGet('SELECT admin_id FROM Admin WHERE username = ?', [username]);
        if (existing) {
            return res.status(409).json({ error: 'Username sudah digunakan' });
        }

        const status = 'pending';
        const hash = bcrypt.hashSync(password, 10);

        await dbRun(
            'INSERT INTO Admin (username, password, full_name, role, status) VALUES (?, ?, ?, ?, ?)',
            [username, hash, full_name || null, role, status]
        );

        await logAction(null, 'USER_REGISTERED', `New registration: ${username} (${role}) — status: ${status}`, ip);

        if (status === 'approved') {
            res.status(201).json({ message: 'Registrasi berhasil! Silakan login.' });
        } else {
            res.status(201).json({ message: 'Registrasi berhasil! Akun Anda perlu diverifikasi oleh admin sebelum bisa login.' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.registerAdminOnly = async (req, res) => {
    const { username, password, role, full_name } = req.body;

    try {
        const existing = await dbGet('SELECT admin_id FROM Admin WHERE username = ?', [username]);
        if (existing) {
            return res.status(409).json({ error: 'Username already exists' });
        }

        const hash = bcrypt.hashSync(password, 10);
        const result = await dbRun(
            'INSERT INTO Admin (username, password, full_name, role, status) VALUES (?, ?, ?, ?, ?)',
            [username, hash, full_name || null, role, 'approved']
        );

        await logAction(req.user.userId, 'USER_CREATED', `Created user: ${username} (${role})`, req.ip);

        res.status(201).json({
            message: 'User created successfully',
            userId: result.insertId,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.getMe = async (req, res) => {
    try {
        const user = await dbGet('SELECT admin_id, username, full_name, role, created_at FROM Admin WHERE admin_id = ?', [req.user.userId]);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch(err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};
