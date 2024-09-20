import { main } from './main.js';
import dotenv from 'dotenv';
dotenv.config();


// Captura rejeições de promessas não tratadas
process.on('unhandledRejection', (reason, promise) => {
    console.log('Rejeição de Promise não capturada:', reason.message);
    // Aqui você pode continuar ou registrar o erro sem parar a execução
  });
  
  // Captura exceções não tratadas
  process.on('uncaughtException', (error) => {
    console.log('Erro não capturado:', error.message);
    // Novamente, pode continuar a execução ou sair do processo de forma controlada
  });
  
  // Aqui você coloca o resto do código
  console.log('Iniciando a aplicação...');

//bootstrap
main();
