import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

const allowedOrigins = [
  'http://localhost:5173',          // Para desarrollo local con Vite
  'http://localhost:3000',          // Local alternativo
  'https://hernandw.github.io/p-l_calendar_trading/'      // Tu frontend oficial en GitHub Pages
];

app.use(cors({
  origin: function (origin, callback) {
    // Permitir solicitudes sin origen (como Postman o curl) o si están en la lista blanca
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Bloqueado por política CORS de Express'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));



app.use(express.json({ limit: '50mb' }));

// Asegurar carpeta de datos y registro de usuarios
async function initStorage() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
      await fs.access(USERS_FILE);
    } catch {
      await fs.writeFile(USERS_FILE, JSON.stringify([], null, 2), 'utf-8');
    }
  } catch (err) {
    console.error("Error inicializando storage:", err);
  }
}

// Helper para obtener archivo de datos de un usuario específico
async function getUserDataFile(username) {
  const safeName = username.replace(/[^a-zA-Z0-9_]/g, '_');
  return path.join(DATA_DIR, `user_${safeName}.json`);
}

// 1. REGISTRO DE USUARIO
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
    }

    const usersRaw = await fs.readFile(USERS_FILE, 'utf-8');
    const users = JSON.parse(usersRaw);

    if (users.some(u => u.username === username)) {
      return res.status(400).json({ error: 'El usuario ya existe' });
    }

    users.push({ username, password });
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');

    // Crear archivo de trading inicial para el usuario
    const userFile = await getUserDataFile(username);
    const initialData = {
      activeAccountId: "acc_default",
      isDarkMode: true,
      accounts: [
        {
          id: "acc_default",
          broker: "Interactive Brokers",
          number: "U000000",
          type: "Margin",
          currency: "USD",
          appData: {},
          capitalFlows: []
        }
      ]
    };
    await fs.writeFile(userFile, JSON.stringify(initialData, null, 2), 'utf-8');

    res.json({ success: true, message: 'Usuario registrado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. LOGIN DE USUARIO
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const usersRaw = await fs.readFile(USERS_FILE, 'utf-8');
    const users = JSON.parse(usersRaw);

    const user = users.find(u => u.username === username && u.password === password);
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Token simple basado en timestamp (sesión válida en cliente)
    res.json({ success: true, token: Buffer.from(`${username}:${Date.now()}`).toString('base64'), username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Middleware de autenticación por Token
const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No autorizado' });
  try {
    const token = authHeader.split(' ')[1];
    const decoded = Buffer.from(token, 'base64').toString('ascii');
    const [username, timestamp] = decoded.split(':');
    
    // Validar expiración de sesión (3 minutos = 180000 ms)
    if (Date.now() - parseInt(timestamp, 10) > 3 * 60 * 1000) {
      return res.status(401).json({ error: 'Sesión expirada. Inicie sesión nuevamente.' });
    }

    req.username = username;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
};

// 3. OBTENER DATOS DE TRADING DEL USUARIO
app.get('/api/data', authMiddleware, async (req, res) => {
  try {
    const userFile = await getUserDataFile(req.username);
    try {
      const raw = await fs.readFile(userFile, 'utf-8');
      res.json(JSON.parse(raw));
    } catch {
      res.json({ accounts: [], activeAccountId: null, isDarkMode: true });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. GUARDAR DATOS DE TRADING DEL USUARIO
app.post('/api/data', authMiddleware, async (req, res) => {
  try {
    const userFile = await getUserDataFile(req.username);
    await fs.writeFile(userFile, JSON.stringify(req.body, null, 2), 'utf-8');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. BACKUP EN DISCO
app.post('/api/backup', authMiddleware, async (req, res) => {
  try {
    const userFile = await getUserDataFile(req.username);
    const raw = await fs.readFile(userFile, 'utf-8');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(DATA_DIR, `backup_${req.username}_${timestamp}.json`);
    await fs.writeFile(backupPath, raw, 'utf-8');
    res.json({ success: true, backupPath: `data/backup_${timestamp}.json` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

initStorage().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Backend corriendo en puerto https://localhost:${PORT}`);
  });
});