import { google } from "googleapis";
import * as dotenv from "dotenv";
import * as readline from "readline";

// Carregar variáveis de ambiente do .env
dotenv.config();

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REDIRECT_URI = "https://developers.google.com/oauthplayground"; // URI padrão recomendada

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("ERRO: GMAIL_CLIENT_ID ou GMAIL_CLIENT_SECRET não definidos no seu arquivo .env");
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// Definindo os escopos necessários para o Gmail
const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.modify"
];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline", // ESSENCIAL para receber o refresh_token
  prompt: "consent",      // ESSENCIAL para garantir que o refresh_token seja gerado
  scope: SCOPES,
});

console.log("\n--- GERADOR DE GMAIL REFRESH TOKEN ---");
console.log("1. Abra a URL abaixo no seu navegador:");
console.log(authUrl);
console.log("\n2. Faça login com a conta do Gmail desejada.");
console.log("3. Se o Google disser que o app não é verificado, clique em 'Avançado' e 'Acessar (nome do seu app) (não seguro)'.");
console.log("4. Após dar permissão, você será redirecionado para o OAuth Playground.");
console.log("5. Copie o parâmetro 'code' que aparece na URL final do navegador.");
console.log("   Exemplo: https://developers.google.com/oauthplayground/?code=4/0Af...&scope=...");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("\nCole o código (code) aqui: ", async (code) => {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    console.log("\n--- SUCESSO! ---");
    console.log("Aqui está o seu REFRESH TOKEN:");
    console.log("\n" + tokens.refresh_token + "\n");
    console.log("Copie este valor para a variável GMAIL_REFRESH_TOKEN no seu arquivo .env");
    console.log("----------------\n");
  } catch (error: any) {
    console.error("Erro ao gerar o token:", error.response?.data || error.message);
  } finally {
    rl.close();
  }
});
