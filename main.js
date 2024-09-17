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
    tokens = Math.min(bucketCapacity, tokens + tokensToAdd); // Repor tokens até o máximo da capacidade
    lastRefillTime = currentTime; // Atualiza o tempo da última reposição

}
}

// Função para consumir tokens do bucket
function consumeToken() {
    refillTokens();

    if (tokens > 0 ) {
        tokens--; // Consome um token
        requestCount++; // Incrmenta a contagem de requisições

        // Verifica se atingiu o limite diário de requisições
        if (requestCount >= DAILY_LIMIT) {
            throw new Error('Limite diário de requisições atingido.');
        }
    } else {
        // Se não houver tokens disponíveis, esperar até que tokens sejam repostos
        const waitTime = (1 / REQ_PER_SECOND) * 1000 // Tempo de espera em milisegundos
        Utilities.sleep(waitTime);
        consumeToken(); // Tente novamente após esperar
    }
}

// Função para tentar chamadas à API controle de taxa usando o tokens Bucket
function retryApiCall(apiFunction, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            consumeToken(); // Consome um token antes de fazer a requisição
            return apiFunction(); // Xecuta a função da API
        } catch (error) {
          let retryableErrors = ['Transient failure' , 'Backend Error' , 'Rate Limit Exceeded'];
          if (retryableErrors.some(errMsg => error.message.includes(errmsg))) {
            Logger.log(`Tentativa ${i + 1} falhou com erro: ${error.message}`);
            Utilities.sleep(500 * Math.pow(2, i)); // Atraso exponencial
          }  else if (error.message.includes('File not found' , 'Permission not fount')) {
            Logger.log('não encontrado, contiuando...');
            continue;
        }  else {
            throw error; // Lança outros erros não tratados
        }
    }
 }
 throw new Error('Falha na requisição após várias tentativas.');
}

function main() {
    try {
        // Definir o tempo máximo de execução em milisegundos (300 segundos = 5 minutos)
        const maxExecutionTime = 30000;
        const starTime = new Date().getTime();

        const scrpitproperties = PropertiesService.getScriptProperties();
        let nextPageToken = scriptProperties.getProperty('nextPageToken');
        let processedDrives = parsenInt(scriptproperties.getProperty('processedDrives')) || 0;

        // Lista de IDs de Shared Drives a serem ignorados
        const ignoredDriveIds = [
            '0ABOIuot1_kA6Uk9PVA', '0ABucz2a8rYGXUk9PVA', '0AOEoSlFU9a5EUk9PVA',
    '0APpp3q6MTRejUk9PVA', '0APVAEYGEZ9epUk9PVA', '0AJ97hstKBlBwUk9PVA',
    '0AH1VJQgJWBHYUk9PVA', '0AKf_wyW2az5-Uk9PVA', '0ACNSKd3rCT5iUk9PVA',
    '0AESJlnXWY348Uk9PVA', '0APyYmDVdcu7gUk9PVA', '0AMNvmlzKPAo5Uk9PVA',
    '0AO0GsdkA6SvzUk9PVA', '0AOvO5wFuMw24Uk9PVA', '0AJZUydK7xtvKUk9PVA',
    '0AC5VaSPc3A3sUk9PVA', '0AM08s3rWS5vVUk9PVA', '0ACc3HKmBr6GHUk9PVA',
    '0ABbh20i83GuEUk9PVA', '0AExIEt958andUk9PVA', '0AEFEDyRPSNEmUk9PVA',
    '0ALDrTJCw0r_gUk9PVA', '0AEocRypb8BMOUk9PVA', '0AA7BIdVoC-cSUk9PVA',
    '0AF2BT4gmld-XUk9PVA', '0ALfuFI8xafdCUk9PVA', '0AH-QDTh2EZwBUk9PVA',
    '0AAp4Ki5m5su7Uk9PVA', '0ALHy9V3-jBZ0Uk9PVA', '0ABraknk1NWSCUk9PVA',
    '0AARWj9wjsQPLUk9PVA', '0AOEH2VPeQfpkUk9PVA', '0APXej9RbyvwOUk9PVA',
    '0APEJe-ArP0OXUk9PVA', '0ALRCfW9-Ik09Uk9PVA', '0AD4BXav9_gtZUk9PVA',
    '0ANRijD32Nt8WUk9PVA', '0ALblyK_08wAVUk9PVA', '0ABM8cFM7TZNEUk9PVA',
    '0AOsGi-i18UiUUk9PVA', '0ABTkYYNdDeZMUk9PVA', '0ACrJf4haEJ31Uk9PVA',
    '0AFNxDEFTtWZcUk9PVA', '0AONaUeXqmF5bUk9PVA', '0AO-oOCVaP7sQUk9PVA',
    '0AOsGi-i18UiUUk9PVA', '0ABM8cFM7TZNEUk9PVA', '0AAk1dk8WF4gtUk9PVA',
    '0ACl5cKqBm81jUk9PVA'
        ];
        // Define a data de corte para 3 anos atrás
        const threeYearsAgo = new Date();
        threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

        // Buscar Shared Drives
        const drivesResult = listSharedDrives(nextPageToken);
        
        for (const drive of Result.driveDetails) {
            processedDrives++; // Atualizar progesso

            const createdTime = new Date(drive.createdTime); // Data de criação do Drive

            if (!ignoredDriveIds.includes(drive.id) && createdTime < threeYearsAgo) {
                Logger.log(`Processando arquivos no Shared Drive ID: ${drive.id}, Nome: ${drive.name}`);

                // Adicionar organizador ao Drive
                addOrganizerToDrive(drive.id);

                //Listar e limpar arquivos
                listFilesAndCleanup(drive.id);

                // Verificar o tempo de execução restante
                const currentTime = new Date().getTime();
                if (currentTime - startTime > maxExecutionTime - 30000) {
                    // Se restarem 30 segundos
                    Logger.log("Tempo de execução se esgotando, reagendando...");

                    scriptProperties.setProperty('processedDrives' , processedDrives.toString());

                    if (drivesResult.nextPageToken != null) {
                        scriptProperties.setProperty('nextPageToken' , drivesResult.nextPageToken);
                    } else {
                        scriptProperties.deleteProperty('nextPageToken');
                    }

                    // Saia da função; o script será invocado novamente pelo acionador baseado em tempo.
                    return;
                }
            }
        }

        // Atualizar token e progresso para continuar no próximo lote
        if (drivesResult.nextPageToken != null) {
            scriptproperties.setProperty('nextPageToken' , drivesResult.nextPageToken);
        } else {
            scriptproperties.deleteProperty('nextPageToken');
        }

        scriptProperties.setProperty('processedDrives' , processedDrives.toString());

        if (!drivesResult.nextPageToken) {
            // Limpar as propriedades quando o processamento terminar
            scriptProperties.deleteProperty('nextPageToken');
            scriptProperties.deleteProperty('processedDrives');
            Logger.log(`Total de Drives processados: ${processedDrives}`);
        }
    } catch(error) {
        Logger.log(`Erro na função main: ${error.message}`);
    }  
}