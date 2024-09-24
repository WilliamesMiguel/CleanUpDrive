import GoogleService from './services/googleService.js';
import pLimit from 'p-limit';
import ignoredDriveIds from './config/ignoredDrives.js'
import driveProcessingQueue from './queue.js'

export async function main() {
  const googleService = new GoogleService();


  try {
    let nextPageToken = null;
    let processedDrives = 0;
    let totalPages = 0;

    // Define a data de corte para 3 anos atrás
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

    do {
      totalPages++;
      console.log(`Buscando Shared Drives - Página ${totalPages} com pageToken: ${nextPageToken}`);
      const drivesResult = await googleService.listSharedDrives(nextPageToken);
      console.log(`Página ${totalPages} retornou ${drivesResult.driveDetails.length} drives.`);

      for (const drive of drivesResult.driveDetails) {
        processedDrives++; // Atualizar progresso

        const createdTime = new Date(drive.createdTime); // Data de criação do Drive

        if (!ignoredDriveIds.includes(drive.id) && createdTime < threeYearsAgo) {


          // Enfileirar a tarefa de processamento do drive
          await driveProcessingQueue.add({
            driveId: drive.id,
            driveName: drive.name,
          });
        }
      }

      nextPageToken = drivesResult.nextPageToken;
    } while (nextPageToken); // Continuar enquanto houver páginas

    console.log(`Total de Drives processados: ${processedDrives}`);
    console.log(`Total de Páginas Processadas: ${totalPages}`);
  } catch (error) {
    console.error(`Erro na função main: ${error.message}`);
  }
}

