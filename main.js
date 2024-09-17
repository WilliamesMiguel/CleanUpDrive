//Limite requisições bucket e capacidade máxima

const REQ_PER_SECOND = 10; // Limite de requisões por segundo
const DAILY_LIMIT = 10000000; // Limite diário de 1.000.000 requisições
let requestCount = 0; // Contagem de requisições feitas durante a execuração
let tokens = REQ_PER_SECOND; //Tokens iniciais no bucket
const bucketCapacity = REQ_PER_SECOND; // Capacidade máximo do bcuket

// Função para repor tokens no bucket
function refillTokens() {
    const currentTime = new Date().getTime();
    const timeSinceLastRefill = (currentTime - Last) / 1000; //Segundos desde a última reposição

// Calcula quantos tokens adicionar
const tokensToAdd = Math.floor(timeSinceLastRefill * REQ_PER_SECOND);

if (tokensToAdd > 0 ) {
    tokens = Math.min(bucketCapacity, tokens + tokensToAdd);
    lastRefillTime = currentTime;
}
}