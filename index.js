import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || "azdevcoder/giovana-contratos"; 
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";

if (!GITHUB_TOKEN) {
  console.error("Falta a variável de ambiente GITHUB_TOKEN.");
  process.exit(1);
}

// CONFIGURAÇÃO DE CORS REFORÇADA
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Responder a requisições de teste (OPTIONS) que o navegador faz antes do POST
app.options("*", cors());

app.use(express.json({ limit: "30mb" }));

app.get("/health", (req, res) => res.json({ ok: true }));

// Função auxiliar para falar com o GitHub
async function atualizarArquivoGithub(path, contentBase64, message) {
  const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${encodeURIComponent(path)}`;
  
  const getResp = await fetch(`${url}?t=${Date.now()}`, {
    headers: { Authorization: `token ${GITHUB_TOKEN}` }
  });

  let sha;
  if (getResp.ok) {
    const getJson = await getResp.json();
    sha = getJson.sha;
  }

  const body = {
    message,
    content: contentBase64,
    branch: GITHUB_BRANCH
  };
  if (sha) body.sha = sha;

  return await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
}

// --- SERVIÇO 1: CONTRATOS ---
app.post("/upload", async (req, res) => {
  try {
    const { nomeArquivo, conteudoBase64 } = req.body;
    const path = `dados/fichas/${nomeArquivo}`;
    const resp = await atualizarArquivoGithub(path, conteudoBase64, `Upload contrato: ${nomeArquivo}`);
    
    if (resp.ok) return res.json({ ok: true });
    const errData = await resp.json();
    res.status(500).json({ error: "Erro GitHub", details: errData });
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

// --- SERVIÇO 2: AGENDAMENTOS ---
app.post("/salvar-agenda", async (req, res) => {
  try {
    const eventos = req.body;
    const jsonString = JSON.stringify(eventos, null, 2);
    const base64 = Buffer.from(jsonString, 'utf-8').toString('base64');
    
    const path = `dados/agendamento.json`;
    const resp = await atualizarArquivoGithub(path, base64, "Sincronização agenda");

    if (resp.ok) return res.json({ ok: true });
    const errData = await resp.json();
    res.status(500).json({ error: "Erro GitHub", details: errData });
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

app.listen(PORT, () => console.log(`Servidor AzDev rodando na porta ${PORT}`));
