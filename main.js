import GoogleService from './services/googleService.js';
import ignoredDriveIds from './config/ignoredDrives.js';

export async function main() {
  const googleService = new GoogleService();

  try {
    let nextPageToken = null;
    let processedDrives = 0;

    // Define a data de corte para 1 ano atrás
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    // Buscar Shared Drives

    const drivesResult = await googleService.listSharedDrives(nextPageToken);
    
      for (const drive of drivesResult.driveDetails) {
        processedDrives++; // Atualizar progresso

        const createdTime = new Date(drive.createdTime); // Data de criação do Drive

        if (!ignoredDriveIds.includes(drive.id) && createdTime < oneYearAgo) {
          console.log(`Processando arquivos no Shared Drive ID: ${drive.id}, Nome: ${drive.name}`);

          // Adicionar organizador ao Drive
          googleService.addOrganizerToDrive(drive.id);

          // Listar e limpar arquivos
          googleService.listFilesAndCleanup(drive.id);
        }
      }

      if (!drivesResult.nextPageToken) {
        console.log(`Total de Drives processados: ${processedDrives}`);
      }
  } catch (error) {
    console.log(`Erro na função main: ${error.message}`);
  }
}