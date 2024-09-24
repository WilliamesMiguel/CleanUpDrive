// arena.js
import Arena from 'bull-arena';
import Bull from 'bull'; // Importa o Bull usando a sintaxe ES6
import express from 'express';

const app = express();

const arena = Arena(
  {
    Bull, // Passa o Bull importado
    queues: [
      {
        type: 'bull', // Especifica o tipo da fila
        name: 'drive-processing',
        hostId: 'Queue Server',
        redis: {
          host: 'localhost',
          port: 6379,
        },
      },
    ],
  },
  {
    basePath: '/arena', // Caminho base para a interface do Arena
    disableListen: true,
  }
);

app.use('/', arena);

app.listen(4567, () => {
  console.log('Arena está rodando em http://localhost:4567/arena');
});
