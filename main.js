const GoogleService = require('./GoogleService'); // Importando o GoogleService
const googleService = new GoogleService(); // Criando a instância do GoogleService
const { listSharedDrives, addOrganizerToDrive, listFilesAndCleanup, removePermissionsAndCleanup } = require('./driveUtil');

// Função principal que será chamada no main.js
function main() {
  try {
    // Definir o tempo máximo de execução em milisegundos (300 segundos = 5 minutos)
    const maxExecutionTime = 300000; // Corrigido para 300 segundos (5 minutos)
    const startTime = new Date().getTime();

    const scriptProperties = PropertiesService.getScriptProperties();
    let nextPageToken = scriptProperties.getProperty('nextPageToken');
    let processedDrives = parseInt(scriptProperties.getProperty('processedDrives')) || 0;

    // Lista de IDs de Shared Drives a serem ignorados
    const ignoredDriveIds = [
      '0ABOIuot1_kA6Uk9PVA', '0ABucz2a8rYGXUk9PVA', // Outros IDs...
    ];

    // Define a data de corte para 3 anos atrás
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

    // Buscar Shared Drives
    listSharedDrives(nextPageToken).then((drivesResult) => {
      for (const drive of drivesResult.driveDetails) {
        processedDrives++; // Atualizar progresso

        const createdTime = new Date(drive.createdTime); // Data de criação do Drive

        if (!ignoredDriveIds.includes(drive.id) && createdTime < threeYearsAgo) {
          console.log(`Processando arquivos no Shared Drive ID: ${drive.id}, Nome: ${drive.name}`);

          // Adicionar organizador ao Drive
          addOrganizerToDrive(drive.id);

          // Listar e limpar arquivos
          listFilesAndCleanup(drive.id);

          // Verificar o tempo de execução restante
          const currentTime = new Date().getTime();
          if (currentTime - startTime > maxExecutionTime - 30000) {
            console.log("Tempo de execução se esgotando, reagendando...");

            scriptProperties.setProperty('processedDrives', processedDrives.toString());

            if (drivesResult.nextPageToken != null) {
              scriptProperties.setProperty('nextPageToken', drivesResult.nextPageToken);
            } else {
              scriptProperties.deleteProperty('nextPageToken');
            }

            return;
          }
        }
      }

      // Atualizar token e progresso para continuar no próximo lote
      if (drivesResult.nextPageToken != null) {
        scriptProperties.setProperty('nextPageToken', drivesResult.nextPageToken);
      } else {
        scriptProperties.deleteProperty('nextPageToken');
      }

      scriptProperties.setProperty('processedDrives', processedDrives.toString());

      if (!drivesResult.nextPageToken) {
        scriptProperties.deleteProperty('nextPageToken');
        scriptProperties.deleteProperty('processedDrives');
        console.log(`Total de Drives processados: ${processedDrives}`);
      }
    });
  } catch (error) {
    console.log(`Erro na função main: ${error.message}`);
  }
}

// Exportando a função main
module.exports = { main };
