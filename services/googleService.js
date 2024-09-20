import { google } from 'googleapis';
import { retryApiCall } from '../utils/retryApiCall.js';

class GoogleService {
  constructor() {
    this.clientEmail = process.env.API_GOOGLE_EMAIL;
    this.privateKey = process.env.API_GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    this.subjectUser = process.env.API_GOOGLE_SUBJECT_USER;

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: this.clientEmail,
        private_key: this.privateKey,
      },
      scopes: [
        'https://www.googleapis.com/auth/drive',
      ],
      clientOptions: { subject: this.subjectUser },
    });

    this.drive = google.drive({
      version: 'v3',
      auth,
    });
  }

  async listSharedDrives(nextPageToken) {
    return retryApiCall(async () => {
      const pageToken = nextPageToken || null;
      const response = await this.drive.drives.list({
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

  async addOrganizerToDrive(driveId) {
    return retryApiCall(async () => {
      const permission = {
        role: 'organizer',
        type: 'user',
        emailAddress: 'lucas.nogueira@bravostudios.tv',
      };

      this.drive.permissions.create({
        resource: permission,
        fileId: driveId,
        supportsAllDrives: true,
        useDomainAdminAccess: true,
      });
    });
  }

  async listFilesAndCleanup(sharedDriveId) {
    console.log("Processando Drive ID: " + sharedDriveId);

    const extensions = ['.srt', '.sub', '.xlsx', '.doc', '.docx', '.stl', '.pdf', 'txt', 'rtf', 'tif', 'cap', 'scc', 'xml'];

    const listFilesInFolder = async (folderId) => {
      let pageToken = null;

      do {
        const response = await retryApiCall(async () => {
          return this.drive.files.list({
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

                await retryApiCall(async () => {
                  await this.drive.files.delete({
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
    };

    await listFilesInFolder(sharedDriveId)
    await this.removePermissionsAndCleanup(sharedDriveId);
  }

  async removePermissionsAndCleanup(sharedDriveId) {
    console.log("Removendo permissões no Shared Drive ID: " + sharedDriveId);

    await retryApiCall(async () => {
      const response = await this.drive.permissions.list({
        fileId: sharedDriveId,
        supportsAllDrives: true,
        useDomainAdminAccess: true,
      });

      if (response && response.data.permissions) {
        response.data.permissions.forEach(async (permission) => {
          if (permission && permission.id) {
            console.log('Removendo permissão para o usuário com ID: ' + permission.id);
            try {
              await retryApiCall(async () => {
                this.drive.permissions.delete({
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
}

export default GoogleService;
