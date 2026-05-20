const { dbRun, dbGet, dbAll } = require('../models/db');
const { logAction } = require('../middleware/auth');

const VALID_TRANSITIONS = {
    'manufactured': { next: 'distributed', roles: ['supplier', 'admin'] },
    'distributed': { next: 'sold', roles: ['supplier', 'admin'] },
};

exports.updateStatus = async (req, res) => {
    const { productId } = req.params;

    try {
        const product = await dbGet('SELECT * FROM Product WHERE product_id = ?', [productId]);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const transition = VALID_TRANSITIONS[product.status];
        if (!transition) {
            return res.status(400).json({ error: `Product cannot transition from status: ${product.status}` });
        }

        if (!transition.roles.includes(req.user.role)) {
            return res.status(403).json({ error: `Role '${req.user.role}' cannot perform this transition` });
        }

        // Update product status
        await dbRun('UPDATE Product SET status = ? WHERE product_id = ?', [transition.next, productId]);

        // Add supply chain record
        await dbRun(
            'INSERT INTO supply_chain (product_id, actor, actor_id, status) VALUES (?, ?, ?, ?)',
            [productId, req.user.username, req.user.userId, transition.next]
        );

        await logAction(req.user.userId, 'SUPPLY_CHAIN_UPDATE', `Product ${productId}: ${product.status} → ${transition.next}`, req.ip);

        res.json({
            message: 'Product status updated',
            product_id: productId,
            previous_status: product.status,
            new_status: transition.next,
        });
    } catch (err) {
        console.error(err);
        await logAction(req.user.userId, 'SYSTEM_ERROR', err.message, req.ip);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.getHistory = async (req, res) => {
    try {
        const history = await dbAll(
            'SELECT * FROM supply_chain WHERE product_id = ? ORDER BY timestamp ASC',
            [req.params.productId]
        );

        if (history.length === 0) {
            return res.status(404).json({ error: 'No supply chain records found' });
        }

        res.json(history);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.getList = async (req, res) => {
    try {
        const products = await dbAll(
            'SELECT product_id, product_name, batch_number, status, created_at FROM Product ORDER BY created_at DESC'
        );
        res.json(products);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};
