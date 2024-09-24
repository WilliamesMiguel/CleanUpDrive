import axios from 'axios';
import jwt from 'jsonwebtoken';
import { retryApiCall } from '../utils/retryApiCall.js';

class GoogleService {
  constructor() {
    this.clientEmail = process.env.API_GOOGLE_EMAIL;
    this.privateKey = process.env.API_GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    this.subjectUser = process.env.API_GOOGLE_SUBJECT_USER;
    this.scopes = ['https://www.googleapis.com/auth/drive'];

    this.token = null;
    this.tokenExpiry = null;
  }

  async getAccessToken() {
    const now = Math.floor(Date.now() / 1000);

    if (this.token && this.tokenExpiry && now < this.tokenExpiry - 60) {
      return this.token;
    }

    const payload = {
      iss: this.clientEmail,
      scope: this.scopes.join(' '),
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
      sub: this.subjectUser,
    };

    const signedJWT = jwt.sign(payload, this.privateKey, { algorithm: 'RS256' });

    const params = new URLSearchParams();
    params.append('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer');
    params.append('assertion', signedJWT);

    try {
      const response = await axios.post('https://oauth2.googleapis.com/token', params);
      this.token = response.data.access_token;
      this.tokenExpiry = now + response.data.expires_in;
      console.log('Token de acesso obtido com sucesso.');
      return this.token;
    } catch (error) {
      console.error('Erro ao obter token de acesso:', error.response?.data || error.message);
      throw error;
    }
  }

  async listSharedDrives(nextPageToken) {
    return retryApiCall(async () => {
      const accessToken = await this.getAccessToken();

      const params = {
        useDomainAdminAccess: true,
        pageToken: nextPageToken,
        pageSize: 100,
        fields: 'nextPageToken, drives(id, name, createdTime)',
      };

      const response = await axios.get('https://www.googleapis.com/drive/v3/drives', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params,
      });

      return {
        driveDetails: response.data.drives || [],
        nextPageToken: response.data.nextPageToken,
      };
    });
  }

  async addOrganizerToDrive(driveId) {
    return retryApiCall(async () => {
      const accessToken = await this.getAccessToken();

      const permission = {
        role: 'organizer',
        type: 'user',
        emailAddress: 'gcp@bravostudios.tv',
      };

      const response = await axios.post(
        `https://www.googleapis.com/drive/v3/files/${driveId}/permissions`,
        permission,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          params: {
            supportsAllDrives: true,
            useDomainAdminAccess: true,
          },
        }
      );

      return response.data;
    });
  }

  async listFilesAndCleanup(sharedDriveId) {
    console.log('Processando Drive ID: ' + sharedDriveId);

    const extensions = [
      '.srt',
      '.sub',
      '.xlsx',
      '.doc',
      '.docx',
      '.stl',
      '.pdf',
      'txt',
      'rtf',
      'tif',
      'cap',
      'scc',
      'xml',
      'jpg',
      'jpeg',
      'png'
    ];

    const listFilesInFolder = async (folderId) => {
      let pageToken = null;

      do {
        const response = await retryApiCall(async () => {
          const accessToken = await this.getAccessToken();

          const params = {
            q: `'${folderId}' in parents`,
            corpora: 'drive',
            driveId: sharedDriveId,
            includeItemsFromAllDrives: true,
            supportsAllDrives: true,
            useDomainAdminAccess: true,
            pageToken,
            fields: 'nextPageToken, files(id, name, mimeType)',
          };

          return axios.get('https://www.googleapis.com/drive/v3/files', {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            params,
          });
        });

        const files = response.data.files

        if (files && files.length > 0) {
          for (const file of files) {
            if (file.mimeType === 'application/vnd.google-apps.folder') {
              console.log('Entrando na subpasta: ' + file.name);
              await listFilesInFolder(file.id);
            } else {
              const fileNameLower = file.name.toLowerCase();

              if (!extensions.some((ext) => fileNameLower.endsWith(ext.toLowerCase()))) {
                console.log('Arquivo a ser excluído: Nome: ' + file.name + ' ID: ' + file.id);

                await retryApiCall(async () => {
                  const accessToken = await this.getAccessToken();

                  await axios.delete(`https://www.googleapis.com/drive/v3/files/${file.id}`, {
                    headers: {
                      Authorization: `Bearer ${accessToken}`,
                    },
                    params: {
                      supportsAllDrives: true,
                    },
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

    await listFilesInFolder(sharedDriveId);
    await this.removePermissionsAndCleanup(sharedDriveId);
  }

  async removePermissionsAndCleanup(sharedDriveId) {
    console.log('Removendo permissões no Shared Drive ID: ' + sharedDriveId);

    await retryApiCall(async () => {
      const accessToken = await this.getAccessToken();

      const response = await axios.get(
        `https://www.googleapis.com/drive/v3/files/${sharedDriveId}/permissions`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params: {
            supportsAllDrives: true,
            useDomainAdminAccess: true,
          },
        }
      );

      if (response && response.data.permissions) {
        for (const permission of response.data.permissions) {
          if (permission && permission.id) {
            console.log('Removendo permissão para o usuário com ID: ' + permission.id);
            try {
              await retryApiCall(async () => {
                const accessToken = await this.getAccessToken();

                await axios.delete(
                  `https://www.googleapis.com/drive/v3/files/${sharedDriveId}/permissions/${permission.id}`,
                  {
                    headers: {
                      Authorization: `Bearer ${accessToken}`,
                    },
                    params: {
                      supportsAllDrives: true,
                    },
                  }
                );
              });
              console.log('Permissão removida: ' + permission.id);
            } catch (error) {
              console.log(
                'Erro ao remover permissão: ' + permission.id + '. Detalhes: ' + error.message
              );
            }
          } else {
            console.log('Permissão inválida ou sem ID. Pulando...');
          }
        }
        console.log(
          'Todas as permissões válidas foram removidas no Shared Drive ID: ' + sharedDriveId
        );
      } else {
        console.log('Nenhuma permissão encontrada ou resposta inválida.');
      }
    });
  }
}

export default GoogleService;
