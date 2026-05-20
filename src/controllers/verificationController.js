const { dbRun, dbGet, dbAll } = require('../models/db');
const { generateSignature } = require('../services/hmacService');

exports.verifyProduct = async (req, res) => {
    const { product_id, signature } = req.body;
    const ip = req.ip;

    // Check if user is authenticated using JWT info attached by middleware, otherwise defaults to "system"
    const checked_by = req.user ? req.user.username : 'system';

    try {
        const product = await dbGet('SELECT * FROM Product WHERE product_id = ?', [product_id]);

        if (!product) {
            // Log to Verification_Record as invalid
            await dbRun(
                'INSERT INTO Verification_Record (product_id, verification_result, checked_by, ip_address) VALUES (?, ?, ?, ?)',
                [product_id, 'invalid', checked_by, ip]
            );

            return res.json({
                status: 'invalid',
                message: 'Product not found in system',
                product_id,
            });
        }

        // Secondary check using HMAC if signature is provided
        if (signature) {
            let prodDateStr = product.production_date;
            if (prodDateStr instanceof Date) {
                // Safely convert Date object to YYYY-MM-DD without timezone shifts
                const yyyy = prodDateStr.getFullYear();
                const mm = String(prodDateStr.getMonth() + 1).padStart(2, '0');
                const dd = String(prodDateStr.getDate()).padStart(2, '0');
                prodDateStr = `${yyyy}-${mm}-${dd}`;
            }
            
            const signatureData = {
                productId: product.product_id,
                product_name: product.product_name,
                batch_number: product.batch_number,
                production_date: prodDateStr,
            };
            const expectedSignature = generateSignature(signatureData);
            
            if (signature !== expectedSignature) {
                 await dbRun(
                    'INSERT INTO Verification_Record (product_id, verification_result, checked_by, ip_address) VALUES (?, ?, ?, ?)',
                    [product_id, 'invalid', checked_by, ip]
                );
                return res.json({
                    status: 'invalid',
                    message: 'Product signature does not match. This may be a counterfeit product.',
                    product_id,
                });
            }
        }

        // It is valid! Record it
        await dbRun(
            'INSERT INTO Verification_Record (product_id, verification_result, checked_by, ip_address) VALUES (?, ?, ?, ?)',
            [product_id, 'valid', checked_by, ip]
        );

        // Fetch supplier info purely for display
        const supplier = await dbGet('SELECT supplier_name FROM Supplier WHERE supplier_id = ?', [product.supplier_id]);

        return res.json({
            status: 'valid',
            message: 'Product is authentic',
            product_id: product.product_id,
            product_name: product.product_name,
            batch_number: product.batch_number,
            production_date: product.production_date,
            supplier_name: supplier ? supplier.supplier_name : null,
            current_status: product.status,
            is_suspicious: product.is_suspicious,
            image_url: product.image_url
        });
        
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};
