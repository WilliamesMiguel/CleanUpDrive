const GoogleService = require('./GoogleService'); // Importando o GoogleService
const googleService = new GoogleService(); // Criando a instância do GoogleService

function listSharedDrives(nextPageToken) {
  return retryApiCall(async function() {
    const pageToken = nextPageToken || null;
    const response = await googleService.drive.drives.list({
      useDomainAdminAccess: true,
      pageToken: pageToken,
      pageSize: 100,
      fields: 'nextPageToken, drives(id, name, createdTime)',
    });

    return {
      driveDetails: response.data.drives || [],
      nextPageToken: response.data.nextPageToken,
    };
  });
}

function addOrganizerToDrive(driveId) {
  return retryApiCall(async function() {
    const permission = {
      role: 'organizer',
      type: 'user',
      emailAddress: 'lucas.nogueira@bravostudios.tv',
    };

    await googleService.drive.permissions.create({
      resource: permission,
      fileId: driveId,
      supportsAllDrives: true,
      useDomainAdminAccess: true,
    });
  });
}

function listFilesAndCleanup(sharedDriveId) {
  console.log("Processando Drive ID: " + sharedDriveId);

  const extensions = ['.srt', '.sub', '.xlsx', '.doc', '.docx', '.stl', '.pdf', 'txt', 'rtf', 'tif', 'cap', 'scc', 'xml'];

  async function listFilesInFolder(folderId) {
    let pageToken = null;

    do {
      const response = await retryApiCall(async function() {
        return googleService.drive.files.list({
          q: `'${folderId}' in parents`,
          corpora: 'drive',
          driveId: sharedDriveId,
          includeItemsFromAllDrives: true,
          supportsAllDrives: true,
          pageToken: pageToken,
          fields: "nextPageToken, files(id, name, mimeType)",
        });
      });

      const files = response.data.files;

      if (files && files.length > 0) {
        for (const file of files) {
          if (file.mimeType === 'application/vnd.google-apps.folder') {
            console.log("Entrando na subpasta: " + file.name);
            await listFilesInFolder(file.id);
          } else {
            const fileNameLower = file.name.toLowerCase();

            if (!extensions.some(ext => fileNameLower.endsWith(ext.toLowerCase()))) {
              console.log('Arquivo a ser excluído: Nome: ' + file.name + ' ID: ' + file.id);

              await retryApiCall(async function() {
                await googleService.drive.files.delete({
                  fileId: file.id,
                  supportsAllDrives: true,
                });
              });
              console.log('Arquivo excluído com sucesso: ' + file.name);
            } else {
              console.log('Arquivo mantido: Nome: ' + file.name + ' ID: ' + file.id);
            }
          }
        }
      }

      pageToken = response.data.nextPageToken;
    } while (pageToken);
  }

  listFilesInFolder(sharedDriveId);
  console.log("Chegou ao final da limpeza do Drive ID: " + sharedDriveId);
  removePermissionsAndCleanup(sharedDriveId);
}

function removePermissionsAndCleanup(sharedDriveId) {
  console.log("Removendo permissões no Shared Drive ID: " + sharedDriveId);

  retryApiCall(async function() {
    const response = await googleService.drive.permissions.list({
      fileId: sharedDriveId,
      supportsAllDrives: true,
      useDomainAdminAccess: true,
    });

    if (response && response.data.permissions) {
      response.data.permissions.forEach(async function(permission) {
        if (permission && permission.id) {
          console.log('Removendo permissão para o usuário com ID: ' + permission.id);
          try {
            await retryApiCall(async function() {
              await googleService.drive.permissions.delete({
                fileId: sharedDriveId,
                permissionId: permission.id,
                supportsAllDrives: true,
              });
            });
            console.log('Permissão removida: ' + permission.id);
          } catch (error) {
            console.log('Erro ao remover permissão: ' + permission.id + '. Detalhes: ' + error.message);
          }
        } else {
          console.log('Permissão inválida ou sem ID. Pulando...');
        }
      });
      console.log('Todas as permissões válidas foram removidas no Shared Drive ID: ' + sharedDriveId);
    } else {
      console.log('Nenhuma permissão encontrada ou resposta inválida.');
    }
  });
}

// Exportar as funções para serem usadas em outro arquivo
module.exports = {
    listSharedDrives,
    addOrganizerToDrive,
    listFilesAndCleanup,
    removePermissionsAndCleanup,
  };