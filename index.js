import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || "azdevcoder/giovana-contratos"; 
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";

// 1. Configuração Robusta de CORS
const corsOptions = {
  origin: "*", // Permite requisições de qualquer lugar
  methods: ["GET", "POST", "PUT", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // Responde ao erro de "Preflight"

app.use(express.json({ limit: "30mb" }));

// Função auxiliar para evitar erros de SHA no GitHub
async function salvarArquivoNoGithub(path, base64, message) {
  const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`;
  
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
    content: base64,
    branch: GITHUB_BRANCH,
    sha: sha // Se o arquivo existir, o SHA garante a atualização
  };

  return await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
}

app.get("/health", (req, res) => res.json({ status: "ok" }));

// --- ROTA DE CONTRATOS ---
app.post("/upload", async (req, res) => {
  try {
    const { nomeArquivo, conteudoBase64 } = req.body;
    const path = `dados/fichas/${nomeArquivo}`;
    const resp = await salvarArquivoNoGithub(path, conteudoBase64, `Contrato: ${nomeArquivo}`);
    if (resp.ok) return res.json({ ok: true });
    const err = await resp.json();
    res.status(500).json(err);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- ROTA DA AGENDA ---
app.post("/salvar-agenda", async (req, res) => {
  try {
    const jsonString = JSON.stringify(req.body, null, 2);
    const base64 = Buffer.from(jsonString).toString("base64");
    const resp = await salvarArquivoNoGithub("dados/agendamento.json", base64, "Update Agenda");
    if (resp.ok) return res.json({ ok: true });
    const err = await resp.json();
    res.status(500).json(err);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(PORT, () => console.log(`Servidor Ativo na porta ${PORT}`));
