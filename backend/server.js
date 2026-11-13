import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

// Definir la carpeta data y la ruta del archivo database.json de forma absoluta
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

app.use(cors());
app.use(express.json());

// Asegurar que la carpeta 'data' exista antes de verificar el archivo
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Inicializar base de datos JSON si no existe dentro de /data
if (!fs.existsSync(DB_FILE)) {
  const initialData = {
    users: [],
    userDatas: {}
  };
  fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf8');
}

const readDB = () => {
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return { users: [], userDatas: {} };
  }
};

const writeDB = (data) => {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
};

// Middleware de autenticación por Token
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

// 1. Registro de usuario
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  }

  const db = readDB();
  const existingUser = db.users.find(u => u.username === username);
  if (existingUser) {
    return res.status(400).json({ error: 'El usuario ya existe' });
  }

  db.users.push({ username, password });

  db.userDatas[username] = {
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

  writeDB(db);
  res.status(201).json({ message: 'Usuario registrado con éxito' });
});

// 2. Inicio de sesión
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const db = readDB();
  const user = db.users.find(u => u.username === username && u.password === password);

  if (!user) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, username });
});

// 3. Obtener datos del journal del usuario autenticado
app.get('/api/data', authenticateToken, (req, res) => {
  const db = readDB();
  const userData = db.userDatas[req.user.username];
  if (!userData) {
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
    db.userDatas[req.user.username] = defaultData;
    writeDB(db);
    return res.json(defaultData);
  }
  res.json(userData);
});

// 4. Guardar / Sincronizar datos del journal
app.post('/api/data', authenticateToken, (req, res) => {
  const db = readDB();
  db.userDatas[req.user.username] = req.body;
  writeDB(db);
  res.json({ success: true, message: 'Datos guardados correctamente en el servidor' });
});

// Servir frontend compilado si existe
app.use(express.static(path.join(__dirname, 'frontend/dist')));

// Ruta comodín compatible con Express 5 para manejar el enrutamiento del frontend
app.get(/(.*)/, (req, res) => {
  const indexPath = path.join(__dirname, 'frontend/dist', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send('API del P&L Trading Journal funcionando correctamente.');
  }
});

app.listen(PORT, () => {
  console.log(`Servidor backend ES6 corriendo en puerto http://localhost:${PORT}`);
});