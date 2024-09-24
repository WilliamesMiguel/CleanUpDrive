// worker.js
import 'dotenv/config'; // Certifique-se de carregar as variáveis de ambiente
import driveProcessingQueue from './queue.js';
import GoogleService from './services/googleService.js';

const googleService = new GoogleService();

// Defina o processador da fila
driveProcessingQueue.process(5, async (job, done) => {
  const { driveId, driveName } = job.data;
  console.log(`Processando Shared Drive ID: ${driveId}, Nome: ${driveName}`);

  try {
    // Adicionar organizador ao Drive
    await googleService.addOrganizerToDrive(driveId);
    console.log(`Organizador adicionado ao Drive ID: ${driveId}`);

    // Listar e limpar arquivos
    await googleService.listFilesAndCleanup(driveId);
    console.log(`Arquivos no Drive ID: ${driveId} foram processados e limpos.`);

    done(); // Indica que o trabalho foi concluído com sucesso
  } catch (error) {
    console.error(`Erro ao processar Drive ID: ${driveId}. Detalhes: ${error.message}`);
    done(error); // Indica que ocorreu um erro ao processar o trabalho
  }
});
