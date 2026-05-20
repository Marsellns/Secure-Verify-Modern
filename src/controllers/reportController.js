const { dbAll, dbGet } = require('../models/db');

exports.getReports = async (req, res) => {
    try {
        const { from, to } = req.query;

        // Build date filter clause
        let dateFilter = '';
        const dateParams = [];
        if (from) {
            dateFilter += ' AND v.verification_date >= ?';
            dateParams.push(from);
        }
        if (to) {
            dateFilter += ' AND v.verification_date <= ?';
            dateParams.push(to + ' 23:59:59');
        }

        const total_verifications = await dbGet(
            `SELECT COUNT(*) as count FROM Verification_Record v WHERE 1=1${dateFilter}`, dateParams
        );
        const valid_verifications = await dbGet(
            `SELECT COUNT(*) as count FROM Verification_Record v WHERE verification_result = 'valid'${dateFilter}`, dateParams
        );
        const invalid_verifications = await dbGet(
            `SELECT COUNT(*) as count FROM Verification_Record v WHERE verification_result = 'invalid'${dateFilter}`, dateParams
        );

        // Additional stats
        const total_products = await dbGet('SELECT COUNT(*) as count FROM Product');
        const total_suppliers = await dbGet('SELECT COUNT(*) as count FROM Supplier');

        const history = await dbAll(`
            SELECT v.*, p.product_name, p.status as product_status 
            FROM Verification_Record v
            LEFT JOIN Product p ON v.product_id = p.product_id
            WHERE 1=1${dateFilter}
            ORDER BY v.verification_date DESC LIMIT 100
        `, dateParams);

        res.json({
            totals: {
                total: total_verifications ? total_verifications.count : 0,
                valid: valid_verifications ? valid_verifications.count : 0,
                invalid: invalid_verifications ? invalid_verifications.count : 0
            },
            summary: {
                total_products: total_products ? total_products.count : 0,
                total_suppliers: total_suppliers ? total_suppliers.count : 0
            },
            filters: {
                from: from || null,
                to: to || null
            },
            history
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

