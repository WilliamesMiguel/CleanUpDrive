import { consumeToken } from "./rateLimiter.js";
import { sleep } from "./sleep.js";

// Função para tentar chamadas à API com controle de taxa usando o Token Bucket
export async function retryApiCall(apiFunction, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      await consumeToken(); // Consome um token antes de fazer a requisição
      return await apiFunction(); // Executa a função da API
    } catch (error) {
      // Verifica se o erro é uma resposta do Axios
      if (error.response) {
        const status = error.response.status;

        // Define quais status são retryáveis
        const retryableStatusCodes = [
          429, // Too Many Requests
          500, // Internal Server Error
          501, // Not Implemented
          502, // Bad Gateway
          503, // Service Unavailable
          504, // Gateway Timeout
          505, // HTTP Version Not Supported
          506, // Variant Also Negotiates
          507, // Insufficient Storage
          508, // Loop Detected
          510, // Not Extended
          511  // Network Authentication Required
        ];
        
        if (retryableStatusCodes.includes(status)) {
          console.log(`Tentativa ${i + 1} falhou com status ${status}: ${error.message}`);
          if (i < retries - 1) {
            // Atraso exponencial: 1s, 2s, 4s, etc.
            const delay = 1000 * Math.pow(2, i);
            console.log(`Aguardando ${delay / 1000} segundos antes da próxima tentativa...`);
            await sleep(delay);
            continue; // Tenta novamente
          }
        } else if (status === 404) {
          console.log(`Recurso não encontrado (404). Ignorando e continuando...`);
          // Decide não retentar em 404 e propaga o erro ou ignora
          return; // Ou `continue;` dependendo do contexto
        } else {
          // Outros erros não tratados
          console.log(`Erro não retryável com status ${status}: ${error.message}`);
          throw error;
        }
      } else {
        // Erros que não são respostas do Axios (e.g., problemas de rede)
        console.log(`Erro de rede ou outro erro sem resposta: ${error.message}`);
        if (i < retries - 1) {
          const delay = 1000 * Math.pow(2, i);
          console.log(`Aguardando ${delay / 1000} segundos antes da próxima tentativa...`);
          await sleep(delay);
          continue; // Tenta novamente
        }
      }

      // Se todas as tentativas falharem, lança um erro
      if (i === retries - 1) {
        throw new Error('Falha na requisição após várias tentativas.');
      }
    }
  }
  
  // Lança erro se todas as tentativas falharem
  throw new Error('Falha na requisição após várias tentativas.');
}
