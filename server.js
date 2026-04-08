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

        return await fetch(url, {
            method: "PUT",
            headers: {
                Authorization: `token ${GITHUB_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });
    } catch (error) {
        console.error("Erro GitHub:", error);
        throw error;
    }
}

// ROTA PARA FICHAS
app.post("/upload-ficha", async (req, res) => {
    try {
        const { nomeArquivo, conteudoBase64 } = req.body;
        // SALVANDO NA PASTA QUE VOCÊ QUER:
        const path = `dados/fichas/${nomeArquivo}`; 
        const response = await salvarNoGithub(path, conteudoBase64, `Nova Ficha: ${nomeArquivo}`);

        if (response.ok) return res.json({ ok: true });
        const err = await response.json();
        res.status(500).json({ error: "Erro GitHub", details: err });
    } catch (err) {
        res.status(500).json({ error: "Erro Interno" });
    }
});

app.get("/", (req, res) => res.send("Servidor Ativo"));
app.listen(PORT, "0.0.0.0", () => console.log(`Rodando na porta ${PORT}`));
