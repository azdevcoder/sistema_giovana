import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configurações Globais
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || "azdevcoder/sistema_giovana"; // Nome correto do repo
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";

if (!GITHUB_TOKEN) {
  console.error("Falta a variável de ambiente GITHUB_TOKEN.");
  process.exit(1);
}

// Libera CORS para evitar erros no navegador
app.use(cors({ origin: "*" })); 
app.use(express.json({ limit: "30mb" }));

app.get("/health", (req, res) => res.json({ ok: true }));

// Lógica Genérica para salvar no GitHub (Evita repetição de código)
async function salvarNoGithub(path, contentBase64, message) {
    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${encodeURIComponent(path)}`;
    
    // Busca o SHA para atualizar se o arquivo já existir
    const getResp = await fetch(`${url}?t=${Date.now()}`, {
        headers: { Authorization: `token ${GITHUB_TOKEN}` }
    });
    
    let sha;
    if (getResp.ok) {
        const getJson = await getResp.json();
        sha = getJson.sha;
    }

    const body = {
        message: message,
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
        if (!nomeArquivo || !conteudoBase64) return res.status(400).json({ error: "Dados incompletos" });

        const path = `dados/fichas/${nomeArquivo}`;
        const resp = await salvarNoGithub(path, conteudoBase64, `Upload contrato: ${nomeArquivo}`);

        if (resp.ok) return res.json({ ok: true });
        const errData = await resp.json();
        return res.status(500).json({ error: "Erro GitHub", details: errData });
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
        const resp = await salvarNoGithub(path, base64, "Sincronização agenda");

        if (resp.ok) return res.json({ ok: true });
        const errData = await resp.json();
        return res.status(500).json({ error: "Erro GitHub", details: errData });
    } catch (err) {
        res.status(500).json({ error: "Erro interno" });
    }
});

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
