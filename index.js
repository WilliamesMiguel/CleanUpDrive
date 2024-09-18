require('dotenv').config(); // Carregar as variáveis de ambiente do .env
const { google } = require('googleapis');

// Configurações da API do Google extraídas do arquivo .env
const clientEmail = process.env.API_GOOGLE_EMAIL;
const privateKey = process.env.API_GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
const subjectUser = process.env.API_GOOGLE_SUBJECT_USER;

class GoogleService {
  constructor() {

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
      scopes: [
        'https://www.googleapis.com/auth/drive',
      ],
      clientOptions: { subject: subjectUser },
    });

    this.drive = google.drive({
      version: 'v3',
      auth,
    });
  }
}

module.exports = GoogleService;

  
