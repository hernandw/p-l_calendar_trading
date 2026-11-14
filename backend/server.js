import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Cargar variables de entorno desde el archivo .env
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

// Credenciales desde el archivo .env
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Error: Faltan las credenciales de Supabase en el archivo .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

app.use(cors());
app.use(express.json());

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token no proporcionado' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido o expirado' });
    req.user = user;
    next();
  });
};

// 1. Registro de usuario (Tabla: users_diario_trading)
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
    }

    // Verificar si el usuario ya existe
    const { data: existingUser } = await supabase
      .from('users_diario_trading')
      .select('username')
      .eq('username', username)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'El usuario ya existe' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Insertar en la tabla users_diario_trading
    const { error: userError } = await supabase
      .from('users_diario_trading')
      .insert([{ username, password: hashedPassword }]);

    if (userError) throw userError;

    // Estructura inicial del journal de trading
    const initialUserData = {
      isDarkMode: true,
      activeAccountId: 'acc_default',
      accounts: [
        {
          id: 'acc_default',
          broker: 'Interactive Brokers',
          number: 'U1234567',
          type: 'Margin',
          appData: {},
          capitalFlows: []
        }
      ]
    };

    // Insertar en la tabla user_datas_diario_trading
    await supabase
      .from('user_datas_diario_trading')
      .insert([{ username, data: initialUserData }]);

    res.status(201).json({ message: 'Usuario registrado con éxito' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error en el servidor al registrar' });
  }
});

// 2. Inicio de sesión (Tabla: users_diario_trading)
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const { data: user, error } = await supabase
      .from('users_diario_trading')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, username });
  } catch (error) {
    res.status(500).json({ error: 'Error en el servidor al iniciar sesión' });
  }
});

// 3. Obtener datos del journal (Tabla: user_datas_diario_trading)
app.get('/api/data', authenticateToken, async (req, res) => {
  try {
    const { data: record, error } = await supabase
      .from('user_datas_diario_trading')
      .select('data')
      .eq('username', req.user.username)
      .single();

    if (error || !record) {
      const defaultData = {
        isDarkMode: true,
        activeAccountId: 'acc_default',
        accounts: [
          {
            id: 'acc_default',
            broker: 'Interactive Brokers',
            number: 'U1234567',
            type: 'Margin',
            appData: {},
            capitalFlows: []
          }
        ]
      };
      await supabase
        .from('user_datas_diario_trading')
        .insert([{ username: req.user.username, data: defaultData }]);
      return res.json(defaultData);
    }

    res.json(record.data);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener datos' });
  }
});

// 4. Guardar datos del journal (Tabla: user_datas_diario_trading)
app.post('/api/data', authenticateToken, async (req, res) => {
  try {
    const { error } = await supabase
      .from('user_datas_diario_trading')
      .update({ data: req.body, updated_at: new Date() })
      .eq('username', req.user.username);

    if (error) throw error;
    res.json({ success: true, message: 'Datos guardados correctamente en Supabase' });
  } catch (error) {
    res.status(500).json({ error: 'Error al guardar datos' });
  }
});

app.use(express.static(path.join(__dirname, 'frontend/dist')));

app.get(/(.*)/, (req, res) => {
  const indexPath = path.join(__dirname, 'frontend/dist', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send('API del P&L Trading Journal con Supabase funcionando.');
  }
});

app.listen(PORT, () => {
  console.log(`Servidor backend conectado a Supabase corriendo en puerto http://localhost:${PORT}`);
});