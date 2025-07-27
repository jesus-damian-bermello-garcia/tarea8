// backend/server.js
const express = require('express');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = 5500;

console.log('🚀 Iniciando servidor...');
console.log('📁 Directorio actual:', __dirname);

// Middlewares
app.use(cors());
app.use(express.json());

// Servir archivos estáticos desde la carpeta frontend
const frontendPath = path.join(__dirname, '..', 'frontend');
console.log('📁 Sirviendo archivos desde:', frontendPath);
app.use(express.static(frontendPath));

// Configuración de PostgreSQL
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'inventario',
    password: process.env.DB_PASSWORD || '1999', // CAMBIAR ESTO
    port: process.env.DB_PORT || 5432,
});

// Verificar conexión a PostgreSQL
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Error al conectar con PostgreSQL:', err.message);
        console.log('⚠️  Continuando sin base de datos para pruebas...');
        return;
    }
    console.log('✅ Conectado a PostgreSQL');
    release();
});

// Crear tablas si no existen
const initializeDatabase = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS productos (
                id SERIAL PRIMARY KEY,
                usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
                nombre VARCHAR(100) NOT NULL,
                cantidad INTEGER NOT NULL DEFAULT 0,
                descripcion TEXT,
                fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('✅ Tablas verificadas/creadas');
    } catch (error) {
        console.error('❌ Error al crear tablas:', error.message);
    }
};

// Función para validar campos vacíos
const validarCamposVacios = (campos) => {
    for (const [campo, valor] of Object.entries(campos)) {
        if (!valor || valor.toString().trim() === '') {
            return `El campo '${campo}' es obligatorio`;
        }
    }
    return null;
};

// Función para validar email
const validarEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
};

// RUTAS API

// Registro de usuario
app.post('/api/registro', async (req, res) => {
    console.log('📨 Solicitud de registro:', req.body);
    const { username, email, password } = req.body;
    
    // Validar campos vacíos
    const error = validarCamposVacios({ username, email, password });
    if (error) {
        console.log('❌ Error de validación:', error);
        return res.status(400).json({ success: false, error });
    }
    
    // Validaciones adicionales
    if (username.trim().length < 3) {
        return res.status(400).json({ 
            success: false, 
            error: 'El username debe tener al menos 3 caracteres' 
        });
    }
    
    if (!validarEmail(email.trim())) {
        return res.status(400).json({ 
            success: false, 
            error: 'El email no es válido' 
        });
    }
    
    if (password.length < 6) {
        return res.status(400).json({ 
            success: false, 
            error: 'La contraseña debe tener al menos 6 caracteres' 
        });
    }
    
    try {
        // Verificar si el usuario ya existe
        const existingUser = await pool.query(
            'SELECT id FROM usuarios WHERE username = $1 OR email = $2', 
            [username.trim(), email.trim()]
        );
        
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'El usuario o email ya existe' 
            });
        }
        
        // Hashear contraseña
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Insertar usuario
        const result = await pool.query(
            'INSERT INTO usuarios (username, email, password) VALUES ($1, $2, $3) RETURNING id',
            [username.trim(), email.trim(), hashedPassword]
        );
        
        console.log('✅ Usuario registrado con ID:', result.rows[0].id);
        
        res.json({
            success: true,
            message: 'Usuario registrado exitosamente',
            user_id: result.rows[0].id
        });
        
    } catch (error) {
        console.error('❌ Error al registrar usuario:', error);
        
        // Si hay error de BD, simular registro para pruebas
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            console.log('⚠️  BD no disponible, simulando registro...');
            return res.json({
                success: true,
                message: 'Usuario registrado exitosamente (modo simulación)',
                user_id: Math.floor(Math.random() * 1000)
            });
        }
        
        res.status(500).json({ 
            success: false, 
            error: 'Error al registrar usuario: ' + error.message 
        });
    }
});

// Login de usuario
app.post('/api/login', async (req, res) => {
    console.log('📨 Solicitud de login:', req.body);
    const { username, password } = req.body;
    
    // Validar campos vacíos
    const error = validarCamposVacios({ username, password });
    if (error) {
        return res.status(400).json({ success: false, error });
    }
    
    try {
        // Buscar usuario
        const result = await pool.query(
            'SELECT * FROM usuarios WHERE username = $1', 
            [username.trim()]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ 
                success: false, 
                error: 'Usuario o contraseña incorrectos' 
            });
        }
        
        const user = result.rows[0];
        
        // Verificar contraseña
        const isValidPassword = await bcrypt.compare(password, user.password);
        
        if (!isValidPassword) {
            return res.status(401).json({ 
                success: false, 
                error: 'Usuario o contraseña incorrectos' 
            });
        }
        
        console.log('✅ Login exitoso para:', user.username);
        
        res.json({
            success: true,
            message: 'Inicio de sesión exitoso',
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });
        
    } catch (error) {
        console.error('❌ Error en login:', error);
        
        // Si hay error de BD pero los datos son válidos, simular login
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            console.log('⚠️  BD no disponible, simulando login...');
            return res.json({
                success: true,
                message: 'Login exitoso (modo simulación)',
                user: {
                    id: 1,
                    username: username,
                    email: 'test@test.com'
                }
            });
        }
        
        res.status(500).json({ 
            success: false, 
            error: 'Error del servidor' 
        });
    }
});

// Productos endpoints
app.get('/api/productos/:userId', async (req, res) => {
    const userId = req.params.userId;
    
    try {
        const result = await pool.query(
            'SELECT * FROM productos WHERE usuario_id = $1 ORDER BY fecha_creacion DESC', 
            [userId]
        );
        
        res.json({ success: true, productos: result.rows });
        
    } catch (error) {
        console.error('❌ Error al obtener productos:', error);
        // Simular productos si BD no está disponible
        res.json({ success: true, productos: [] });
    }
});

app.post('/api/productos', async (req, res) => {
    const { usuario_id, nombre, cantidad, descripcion } = req.body;
    
    const error = validarCamposVacios({ usuario_id, nombre, cantidad });
    if (error) {
        return res.status(400).json({ success: false, error });
    }
    
    try {
        const result = await pool.query(
            'INSERT INTO productos (usuario_id, nombre, cantidad, descripcion) VALUES ($1, $2, $3, $4) RETURNING id',
            [usuario_id, nombre.trim(), parseInt(cantidad), descripcion || '']
        );
        
        res.json({
            success: true,
            message: 'Producto guardado exitosamente',
            producto_id: result.rows[0].id
        });
        
    } catch (error) {
        console.error('❌ Error al guardar producto:', error);
        // Simular guardado si BD no está disponible
        res.json({
            success: true,
            message: 'Producto guardado (modo simulación)',
            producto_id: Math.floor(Math.random() * 1000)
        });
    }
});

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// Middleware de manejo de errores
app.use((err, req, res, next) => {
    console.error('❌ Error del servidor:', err);
    res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
    });
});

// Inicializar base de datos
initializeDatabase();

// Iniciar servidor
app.listen(PORT, () => {
    console.log('🚀 =====================================');
    console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
    console.log('📁 Frontend servido desde:', frontendPath);
    console.log('🔗 Accede a: http://localhost:5500');
    console.log('🚀 =====================================');
});

// Manejo de cierre del servidor
process.on('SIGINT', async () => {
    console.log('\n👋 Cerrando servidor...');
    try {
        await pool.end();
        console.log('✅ Conexiones de BD cerradas');
    } catch (err) {
        console.log('⚠️  Error al cerrar BD:', err.message);
    }
    process.exit(0);
});

// Capturar errores no manejados
process.on('uncaughtException', (err) => {
    console.error('❌ Error no capturado:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promesa rechazada:', reason);
});