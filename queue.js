// queue.js
import Queue from 'bull';

const driveProcessingQueue = new Queue('drive-processing', {
  redis: {
    host: 'localhost',
    port: 6379,
    // Você pode adicionar outras configurações do Redis aqui
  },
});

export default driveProcessingQueue;