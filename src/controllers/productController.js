const { v4: uuidv4 } = require('uuid');
const { dbRun, dbGet, dbAll } = require('../models/db');
const { generateSignature } = require('../services/hmacService');
const { generateQRCode } = require('../services/qrService');
const { logAction } = require('../middleware/auth');

const DEFAULT_IMAGES = [
    '/images/default-product.png',
    '/images/product-watch.png',
    '/images/product-sneaker.png',
];

exports.getCatalog = async (req, res) => {
    try {
        const products = await dbAll(
            `SELECT p.product_id, p.product_name, p.description, p.batch_number, p.production_date, 
                    p.status, p.image_url, p.is_suspicious, p.created_at,
                    a.username as manufacturer_name,
                    s.supplier_name
             FROM Product p 
             LEFT JOIN Admin a ON p.admin_id = a.admin_id 
             LEFT JOIN Supplier s ON p.supplier_id = s.supplier_id
             ORDER BY p.created_at DESC`
        );
        res.json(products);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.createProduct = async (req, res) => {
    const { product_name, description, batch_number, production_date, image_url, supplier_id } = req.body;

    try {
        if (supplier_id) {
            const supplierExists = await dbGet('SELECT supplier_id FROM Supplier WHERE supplier_id = ?', [supplier_id]);
            if (!supplierExists) {
                return res.status(400).json({ error: 'Provided supplier_id does not exist' });
            }
        }

        const productId = 'PRD-' + uuidv4().substring(0, 8).toUpperCase();

        // Generate HMAC-SHA256 signature
        const signatureData = { productId, product_name, batch_number, production_date };
        const signature = generateSignature(signatureData);

        // Generate QR code
        const qrData = JSON.stringify({ product_id: productId, signature });
        const qrCode = await generateQRCode(qrData);

        const finalImage = image_url || DEFAULT_IMAGES[Math.floor(Math.random() * DEFAULT_IMAGES.length)];

        await dbRun(
            `INSERT INTO Product (product_id, product_name, description, batch_number, production_date, signature, qr_code, image_url, admin_id, supplier_id, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'manufactured')`,
            [productId, product_name, description || null, batch_number, production_date, signature, qrCode, finalImage, req.user.userId, supplier_id || null]
        );

        // Add supply chain record
        await dbRun(
            `INSERT INTO supply_chain (product_id, actor, actor_id, status) VALUES (?, ?, ?, 'manufactured')`,
            [productId, req.user.username, req.user.userId]
        );

        await logAction(req.user.userId, 'PRODUCT_REGISTERED', `Product ${productId} registered`, req.ip);

        res.status(201).json({
            message: 'Product registered successfully',
            product: {
                product_id: productId,
                product_name,
                batch_number,
                production_date,
                signature,
                qr_code: qrCode,
                image_url: finalImage,
            },
        });
    } catch (err) {
        console.error(err);
        await logAction(req.user.userId, 'SYSTEM_ERROR', err.message, req.ip);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.getProducts = async (req, res) => {
    try {
        const products = await dbAll('SELECT * FROM Product ORDER BY created_at DESC');
        res.json(products);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.getProductById = async (req, res) => {
    try {
        const product = await dbGet(`
            SELECT p.*, s.supplier_name, a.full_name as registered_by 
            FROM Product p 
            LEFT JOIN Supplier s ON p.supplier_id = s.supplier_id 
            LEFT JOIN Admin a ON p.admin_id = a.admin_id 
            WHERE p.product_id = ?`, [req.params.id]
        );
        
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json(product);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.updateProduct = async (req, res) => {
    const { id } = req.params;
    const { product_name, description, batch_number, production_date, status, supplier_id } = req.body;

    try {
        const product = await dbGet('SELECT * FROM Product WHERE product_id = ?', [id]);
        if (!product) return res.status(404).json({ error: 'Product not found' });

        if (supplier_id) {
            const supplierExists = await dbGet('SELECT supplier_id FROM Supplier WHERE supplier_id = ?', [supplier_id]);
            if (!supplierExists) {
                return res.status(400).json({ error: 'Provided supplier_id does not exist' });
            }
        }

        await dbRun(
            `UPDATE Product SET 
                product_name = COALESCE(?, product_name),
                description = COALESCE(?, description),
                batch_number = COALESCE(?, batch_number),
                production_date = COALESCE(?, production_date),
                status = COALESCE(?, status),
                supplier_id = COALESCE(?, supplier_id)
             WHERE product_id = ?`,
            [product_name, description, batch_number, production_date, status, supplier_id, id]
        );

        await logAction(req.user.userId, 'PRODUCT_UPDATED', `Product ${id} updated`, req.ip);
        res.json({ message: 'Product updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.deleteProduct = async (req, res) => {
    const { id } = req.params;
    try {
        const product = await dbGet('SELECT product_id FROM Product WHERE product_id = ?', [id]);
        if (!product) return res.status(404).json({ error: 'Product not found' });

        await dbRun('DELETE FROM Product WHERE product_id = ?', [id]);
        await logAction(req.user.userId, 'PRODUCT_DELETED', `Product ${id} deleted`, req.ip);
        res.json({ message: 'Product deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};
