import { sleep } from "./sleep.js";

const REQ_PER_SECOND = 10;  // Limite de requisições por segundo
const DAILY_LIMIT = 1000000;  // Limite diário de 1.000.000 requisições
let requestCount = 0;  // Contagem de requisições feitas durante a execução
let lastRefillTime = new Date().getTime();  // Última vez que os tokens foram repostos
let tokens = REQ_PER_SECOND;  // Tokens iniciais no bucket
const bucketCapacity = REQ_PER_SECOND;  // Capacidade máxima do bucket

// Função para repor tokens no bucket
function refillTokens() {
  const currentTime = new Date().getTime();
  const timeSinceLastRefill = (currentTime - lastRefillTime) / 1000;  // Segundos desde a última reposição

  // Calcula quantos tokens adicionar
  const tokensToAdd = Math.floor(timeSinceLastRefill * REQ_PER_SECOND);

  if (tokensToAdd > 0) {
    tokens = Math.min(bucketCapacity, tokens + tokensToAdd);  // Repor tokens até o máximo da capacidade
    lastRefillTime = currentTime;  // Atualiza o tempo da última reposição
  }
}

// Função para consumir tokens do bucket
export async function consumeToken() {
  refillTokens();

  if (tokens > 0) {
    tokens--;  // Consome um token
    requestCount++;  // Incrementa a contagem de requisições

    // Verifica se atingiu o limite diário de requisições
    if (requestCount >= DAILY_LIMIT) {
      throw new Error('Limite diário de requisições atingido.');
    }
  } else {
    // Se não houver tokens disponíveis, esperar até que tokens sejam repostos
    const waitTime = (1 / REQ_PER_SECOND) * 1000;  // Tempo de espera em milissegundos
    await sleep(waitTime);
    await consumeToken();  // Tenta novamente após esperar
  }
}