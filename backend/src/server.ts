import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Configuración de CORS para permitir peticiones desde el frontend de Next.js
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));

app.use(express.json());

// Configuración de Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// Inicialización de WebSockets (Esto se puede mover a src/sockets luego para mayor limpieza)
io.on('connection', (socket) => {
  console.log(`Cliente conectado: ${socket.id}`);

  // Ejemplo: Unirse a un área específica (room)
  socket.on('join_area', (area: string) => {
    socket.join(area);
    console.log(`Socket ${socket.id} se unió al área: ${area}`);
  });

  // Reenvío de comandas en tiempo real
  socket.on('new_order', (data) => {
    console.log('Nueva comanda recibida:', data);
    // Retransmitimos a la vista de cocina y barra (en la vida real se filtraría por tipo de producto)
    io.to('cocina').emit('order_received', data);
    io.to('barra').emit('order_received', data);
  });

  socket.on('disconnect', () => {
    console.log(`Cliente desconectado: ${socket.id}`);
  });
});

// Ruta básica de salud
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Servidor POS funcionando' });
});

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
