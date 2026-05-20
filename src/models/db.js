const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const SCHEMA_PATH = path.join(__dirname, '..', '..', 'db', 'schema.sql');

let pool = null;

async function initDatabase() {
    if (pool) return pool;

    try {
        // Create initial connection to ensure DB exists
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            port: process.env.DB_PORT || 3306
        });
        
        const dbName = process.env.DB_NAME || 'secure_product_verification';
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
        await connection.end();

        // Create the connection pool
        pool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: dbName,
            port: process.env.DB_PORT || 3306,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            multipleStatements: true
        });

        // Run schema
        const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
        await pool.query(schema);

        // Seed default admins/users
        const defaultAdmins = [
            { username: 'admin',      password: 'admin123',   full_name: 'Super Admin', role: 'admin' },
            { username: 'supplier', password: 'supp123456', full_name: 'Main Supplier', role: 'supplier' },
        ];

        for (const u of defaultAdmins) {
            const [existing] = await pool.query('SELECT admin_id FROM Admin WHERE username = ?', [u.username]);
            if (existing.length === 0) {
                const hash = bcrypt.hashSync(u.password, 10);
                await pool.query(
                    "INSERT INTO Admin (username, password, full_name, role, status) VALUES (?, ?, ?, ?, 'approved')", 
                    [u.username, hash, u.full_name, u.role]
                );
                console.log(`✓ Default user created: ${u.username} / ${u.password} (${u.role})`);
            }
        }

        return pool;
    } catch (error) {
        console.error('Database initialization failed:', error);
        throw error;
    }
}

function getPool() {
    if (!pool) throw new Error('Database pool not initialized. Call initDatabase() first.');
    return pool;
}

// Helper: run a query that modifies data (INSERT/UPDATE/DELETE)
async function dbRun(sql, params = []) {
    const conn = getPool();
    const [result] = await conn.execute(sql, params);
    return {
        insertId: result.insertId,
        affectedRows: result.affectedRows
    };
}

// Helper: get a single row
async function dbGet(sql, params = []) {
    const conn = getPool();
    const [rows] = await conn.execute(sql, params);
    return rows.length > 0 ? rows[0] : null;
}

// Helper: get all rows
async function dbAll(sql, params = []) {
    const conn = getPool();
    const [rows] = await conn.execute(sql, params);
    return rows;
}

module.exports = { initDatabase, getPool, dbRun, dbGet, dbAll };
