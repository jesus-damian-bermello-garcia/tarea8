
// config.js - Configuración de base de datos PostgreSQL
const { Pool } = require('pg');

// Configuración de la base de datos
const dbConfig = {
    // Configuración local
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'inventario',
    password: process.env.DB_PASSWORD || '1999', // CAMBIAR ESTO
    port: process.env.DB_PORT || 5432,
    
    // Configuración adicional
    max: 20, // máximo número de conexiones en el pool
    idleTimeoutMillis: 30000, // tiempo antes de cerrar conexiones inactivas
    connectionTimeoutMillis: 2000, // tiempo de espera para conectar
};

// Crear pool de conexiones
const pool = new Pool(dbConfig);

// Manejo de errores del pool
pool.on('error', (err, client) => {
    console.error('❌ Error inesperado en cliente inactivo:', err);
    process.exit(-1);
});

// Función para probar la conexión
const testConnection = async () => {
    try {
        const client = await pool.connect();
        console.log('✅ Conexión a PostgreSQL exitosa');
        
        // Probar consulta básica
        const result = await client.query('SELECT NOW()');
        console.log('🕒 Tiempo del servidor:', result.rows[0].now);
        
        client.release();
        return true;
    } catch (err) {
        console.error('❌ Error al conectar con PostgreSQL:', err.message);
        console.error('📋 Verifica:');
        console.error('   - PostgreSQL está corriendo');
        console.error('   - Las credenciales son correctas');
        console.error('   - La base de datos existe');
        return false;
    }
};



module.exports = {
    pool,
    testConnection,
    initializeTables
};