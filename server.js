import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// Configurações do GitHub - Verifique se estas variáveis estão no painel do Render
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || "azdevcoder/sistema_giovana";
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";

app.use(cors());
app.use(express.json({ limit: "50mb" }));

// --- FUNÇÃO AUXILIAR PARA SALVAR NO GITHUB ---
async function salvarNoGithub(path, conteudoBase64, mensagem) {
    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`;
    
    try {
        // Verifica se o arquivo já existe para obter o SHA (necessário para update)
        const getResp = await fetch(url, {
            headers: { Authorization: `token ${GITHUB_TOKEN}` }
        });
        
        let sha;
        if (getResp.ok) {
            const getJson = await getResp.json();
            sha = getJson.sha;
        }

        const body = {
            message: mensagem,
            content: conteudoBase64,
            branch: GITHUB_BRANCH
        };
        if (sha) body.sha = sha;

        const putResp = await fetch(url, {
            method: "PUT",
            headers: {
                Authorization: `token ${GITHUB_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });

        return putResp;
    } catch (error) {
        console.error("Erro na integração GitHub:", error);
        throw error;
    }
}

// --- ROTA PARA FICHAS DE ACOLHIMENTO ---
app.post("/upload-ficha", async (req, res) => {
    try {
        const { nomeArquivo, conteudoBase64 } = req.body;
        // Caminho exato solicitado: dados/fichas/
        const path = `dados/fichas/${nomeArquivo}`; 
        
        const response = await salvarNoGithub(path, conteudoBase64, `Upload Ficha: ${nomeArquivo}`);

        if (response.ok) {
            return res.json({ ok: true });
        } else {
            const errData = await response.json();
            return res.status(500).json({ error: "Erro GitHub", details: errData });
        }
    } catch (err) {
        res.status(500).json({ error: "Erro interno no servidor" });
    }
});

// --- ROTA AGENDA (MANTIDA) ---
app.post("/salvar-agenda", async (req, res) => {
    try {
        const eventos = req.body;
        const jsonString = JSON.stringify(eventos, null, 2);
        const base64 = Buffer.from(jsonString).toString('base64');
        const response = await salvarNoGithub('dados/agendamento.json', base64, "Sincronização Agenda");
        if (response.ok) return res.json({ ok: true });
        res.status(500).json({ error: "Erro GitHub" });
    } catch (err) { res.status(500).json({ error: "Erro interno" }); }
});

app.get("/", (req, res) => res.send("Servidor Ativo"));
app.listen(PORT, "0.0.0.0", () => console.log(`Rodando na porta ${PORT}`));
