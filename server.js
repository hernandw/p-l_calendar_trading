import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data', 'trading_data.json');

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// 1. Servir archivos estáticos desde 'public' y la raíz
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

// 2. Ruta raíz que entrega index.html automáticamente
app.get('/', async (req, res) => {
  try {
    const publicIndex = path.join(__dirname, 'public', 'index.html');
    await fs.access(publicIndex);
    return res.sendFile(publicIndex);
  } catch {
    return res.sendFile(path.join(__dirname, 'index.html'));
  }
});

// Inicializar archivo de datos si no existe
async function ensureDataFile() {
  try {
    await fs.mkdir(path.join(__dirname, 'data'), { recursive: true });
    await fs.access(DATA_FILE);
  } catch {
    const initialData = {
      activeAccountId: "acc_schwab_main",
      isDarkMode: true,
      accounts: [
        {
          id: "acc_schwab_main",
          broker: "Charles Schwab",
          number: "XXXX7484",
          type: "Margin",
          currency: "USD",
          appData: {},
          capitalFlows: []
        }
      ]
    };
    await fs.writeFile(DATA_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
  }
}

// GET: Obtener todos los datos
app.get('/api/data', async (req, res) => {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf-8');
    res.json(JSON.parse(raw));
  } catch (error) {
    res.status(500).json({ error: 'Error al leer el archivo de datos', details: error.message });
  }
});

// POST: Guardar estado completo
app.post('/api/data', async (req, res) => {
  try {
    const payload = req.body;
    if (!payload.accounts || !Array.isArray(payload.accounts)) {
      return res.status(400).json({ error: 'Formato de datos inválido' });
    }
    await fs.writeFile(DATA_FILE, JSON.stringify(payload, null, 2), 'utf-8');
    res.json({ status: 'ok', message: 'Datos guardados en disco correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al persistir en disco', details: error.message });
  }
});

// POST: Generar backup local con timestamp
app.post('/api/backup', async (req, res) => {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf-8');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(__dirname, 'data', `backup_${timestamp}.json`);
    await fs.writeFile(backupPath, raw, 'utf-8');
    res.json({ status: 'ok', backupPath });
  } catch (error) {
    res.status(500).json({ error: 'Error al generar backup', details: error.message });
  }
});

ensureDataFile().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor listo en: http://localhost:${PORT}`);
  });
});