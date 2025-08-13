const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Configuración de la base de datos
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT
});

// Middleware
app.use(cors());
app.use(express.json());

// Rutas CRUD

// GET - Obtener todas las notas
app.get('/api/notes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM note ORDER BY updated_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET - Obtener una nota por ID
app.get('/api/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM note WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Nota no encontrada' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST - Crear una nueva nota
app.post('/api/notes', async (req, res) => {
  try {
    const { title, content } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'El título es requerido' });
    }
    
    const result = await pool.query(
      'INSERT INTO note (title, content) VALUES ($1, $2) RETURNING *',
      [title, content || '']
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT - Actualizar una nota
app.put('/api/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'El título es requerido' });
    }
    
    const result = await pool.query(
      'UPDATE note SET title = $1, content = $2 WHERE id = $3 RETURNING *',
      [title, content || '', id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Nota no encontrada' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE - Eliminar una nota
app.delete('/api/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM note WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Nota no encontrada' });
    }
    
    res.json({ message: 'Nota eliminada correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Inicializar servidor
const startServer = async () => {
  await initDB();
  app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
  });
};

startServer();