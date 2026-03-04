import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || "azdevcoder/sistema_giovana";
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";

app.use(cors());
app.use(express.json({ limit: "50mb" }));

// --- FUNÇÃO AUXILIAR PARA SALVAR NO GITHUB (Corrigida com async) ---
async function salvarNoGithub(path, conteudoBase64, mensagem) {
    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`;
    
    try {
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
        console.error("Erro na função salvarNoGithub:", error);
        throw error;
    }
}

// --- ROTA DA AGENDA ---
app.post("/salvar-agenda", async (req, res) => {
    try {
        const eventos = req.body;
        const jsonString = JSON.stringify(eventos, null, 2);
        // No ES Modules, usamos Buffer assim:
        const base64 = Buffer.from(jsonString).toString('base64');
        
        const response = await salvarNoGithub('dados/agendamento.json', base64, "Sincronização de Agenda");

        if (response.ok) {
            return res.json({ ok: true });
        } else {
            const errData = await response.json();
            return res.status(500).json({ error: "Erro no GitHub", details: errData });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro interno na Agenda" });
    }
});

// --- ROTA DE UPLOAD DE CONTRATO ---
app.post("/upload", async (req, res) => {
    try {
        const { nomeArquivo, conteudoBase64 } = req.body;
        const path = `dados/${nomeArquivo}`; 
        
        const response = await salvarNoGithub(path, conteudoBase64, `Novo contrato: ${nomeArquivo}`);

        if (response.ok) {
            return res.json({ ok: true });
        } else {
            return res.status(500).json({ error: "Erro ao salvar contrato" });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro interno no Upload" });
    }
});

// --- ROTA DE LISTAGEM DE CONTRATOS ---
app.get('contratos/contratos-assinados', async (req, res) => {
    try {
        const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/contratos`;
        const resp = await fetch(url, {
            headers: { Authorization: `token ${GITHUB_TOKEN}` }
        });

        if (!resp.ok) return res.json([]);

        const data = await resp.json();
        // Filtra apenas PDFs e remove lixo de nomes
        const arquivos = data
            .filter(file => file.name.toLowerCase().endsWith('.pdf'))
            .map(file => ({
                name: file.name
                    .replace('.pdf', '')
                    .replace(/_/g, ' ')
                    .replace(/^[0-9]+-/, ''), // Remove prefixo de data se houver
                url: file.download_url,
                date: "Assinado"
            }));

        res.json(arquivos);
    } catch (err) {
        console.error(err);
        res.json([]);
    }
});

app.listen(PORT, () => console.log(`Servidor AzDev rodando na porta ${PORT}`));
