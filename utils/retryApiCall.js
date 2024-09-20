import { consumeToken } from "./rateLimiter.js";
import { sleep } from "./sleep.js";

// Função para tentar chamadas à API com controle de taxa usando o Token Bucket
export async function retryApiCall(apiFunction, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        await consumeToken();  // Consome um token antes de fazer a requisição
        console.log(`Tentando executar a API. Tentativa número: ${i + 1}`);
        return await apiFunction();  // Executa a função da API
      } catch (error) {
        console.log("caiu no erro")
        let retryableErrors = ['Transient failure', 'Backend Error', 'Rate Limit Exceeded'];
        if (retryableErrors.some(errMsg => error.message.includes(errMsg))) {
          Logger.log(`Tentativa ${i + 1} falhou com erro: ${error.message}`);
           await sleep(500 * Math.pow(2, i));  // Atraso exponencial
        } else if (error.message.includes('File not found', 'Permission not found')) {
          Logger.log('não encontrado, continuando...');
          continue;  
        } else {
          /*throw error;  // Lança outros erros não tratados*/
        }
      }
    }
    throw new Error('Falha na requisição após várias tentativas.');
  }