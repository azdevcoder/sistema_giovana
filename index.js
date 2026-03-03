import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Verifique se estas variáveis estão EXATAMENTE assim no painel do Render
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || "azdevcoder/sistema_giovana"; 
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";

// 1. Configuração de CORS para aceitar o GitHub Pages
app.use(cors({ origin: "*" }));
app.options("*", cors()); // Responde ao "preflight" do navegador
app.use(express.json({ limit: "30mb" }));

// Função mestre para salvar no GitHub (resolve o erro 500 de conflito)
async function salvarArquivoGithub(path, contentBase64, message) {
    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`;
    
    // Tenta buscar o arquivo existente para pegar o SHA
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
    if (sha) body.sha = sha; // Só adiciona o SHA se o arquivo já existir

    return await fetch(url, {
        method: "PUT",
        headers: {
            Authorization: `token ${GITHUB_TOKEN}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    });
}

// --- ROTA DA AGENDA ---
app.post("/salvar-agenda", async (req, res) => {
    try {
        const eventos = req.body;
        const jsonString = JSON.stringify(eventos, null, 2);
        const base64 = Buffer.from(jsonString).toString('base64');
        
        const resp = await salvarArquivoGithub("dados/agendamento.json", base64, "Sincronização Agenda");

        if (resp.ok) {
            return res.json({ ok: true });
        } else {
            const errData = await resp.json();
            console.error("Erro GitHub:", errData);
            return res.status(500).json({ error: "Erro no GitHub", details: errData });
        }
    } catch (err) {
        console.error("Erro Servidor:", err);
        res.status(500).json({ error: "Erro interno" });
    }
});

// --- ROTA DE CONTRATOS ---
app.post("/upload", async (req, res) => {
    try {
        const { nomeArquivo, conteudoBase64 } = req.body;
        const resp = await salvarArquivoGithub(`dados/fichas/${nomeArquivo}`, conteudoBase64, `Upload Contrato: ${nomeArquivo}`);
        
        if (resp.ok) return res.json({ ok: true });
        res.status(500).json(await resp.json());
    } catch (err) {
        res.status(500).json({ error: "Erro interno" });
    }
});

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
