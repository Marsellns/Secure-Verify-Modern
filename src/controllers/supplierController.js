const { dbRun, dbGet, dbAll } = require('../models/db');
const { logAction } = require('../middleware/auth');

exports.getSuppliers = async (req, res) => {
    try {
        const suppliers = await dbAll('SELECT * FROM Supplier');
        res.json(suppliers);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.createSupplier = async (req, res) => {
    const { supplier_name, contact_info, address } = req.body;
    try {
        const result = await dbRun(
            'INSERT INTO Supplier (supplier_name, contact_info, address) VALUES (?, ?, ?)',
            [supplier_name, contact_info, address]
        );

        await logAction(req.user.userId, 'SUPPLIER_CREATED', `Supplier "${supplier_name}" created (ID: ${result.insertId})`, req.ip);

        res.status(201).json({ message: 'Supplier created', supplier_id: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.updateSupplier = async (req, res) => {
    const id = parseInt(req.params.id);
    const { supplier_name, contact_info, address } = req.body;
    try {
        const supplier = await dbGet('SELECT * FROM Supplier WHERE supplier_id = ?', [id]);
        if (!supplier) return res.status(404).json({ error: 'Supplier not found' });

        await dbRun(
            `UPDATE Supplier SET 
                supplier_name = COALESCE(?, supplier_name),
                contact_info = COALESCE(?, contact_info),
                address = COALESCE(?, address)
             WHERE supplier_id = ?`,
            [supplier_name, contact_info, address, id]
        );

        await logAction(req.user.userId, 'SUPPLIER_UPDATED', `Supplier ID ${id} updated`, req.ip);

        res.json({ message: 'Supplier updated' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.deleteSupplier = async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        const supplier = await dbGet('SELECT * FROM Supplier WHERE supplier_id = ?', [id]);
        if (!supplier) return res.status(404).json({ error: 'Supplier not found' });

        await dbRun('DELETE FROM Supplier WHERE supplier_id = ?', [id]);

        await logAction(req.user.userId, 'SUPPLIER_DELETED', `Supplier "${supplier.supplier_name}" (ID: ${id}) deleted`, req.ip);

        res.json({ message: 'Supplier deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};
