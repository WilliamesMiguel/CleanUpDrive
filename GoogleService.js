require('dotenv').config(); // Carregar as variáveis de ambiente do .env
const { google } = require('googleapis');

class GoogleService {
  constructor() {
    // Autenticação com o Google API usando uma chave de serviço
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.API_GOOGLE_EMAIL, // Email da conta de serviço
        private_key: process.env.API_GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Chave privada (do arquivo de credenciais ou .env)
      },
      scopes: [
        'https://www.googleapis.com/auth/drive', // Escopo do Google Drive
      ],
    });

    this.drive = google.drive({
      version: 'v3',
      auth,
    });
  }
}

module.exports = GoogleService;
