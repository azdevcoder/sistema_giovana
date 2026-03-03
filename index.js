import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || "azdevcoder/sistema_giovana"; 
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";

app.use(cors({ origin: "*" }));
app.options("*", cors());
app.use(express.json({ limit: "30mb" }));

async function enviarParaGithub(path, base64, message) {
    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`;
    
    // 1. Tenta pegar o arquivo atual para obter o SHA
    const getResp = await fetch(`${url}?t=${Date.now()}`, {
        headers: { Authorization: `token ${GITHUB_TOKEN}` }
    });

    let sha;
    if (getResp.ok) {
        const data = await getResp.json();
        sha = data.sha;
    }

    // 2. Envia a atualização
    return await fetch(url, {
        method: "PUT",
        headers: {
            Authorization: `token ${GITHUB_TOKEN}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            message,
            content: base64,
            sha, // Importante para não dar erro 500
            branch: GITHUB_BRANCH
        })
    });
}

// ROTA DA AGENDA
app.post("/salvar-agenda", async (req, res) => {
    try {
        const jsonString = JSON.stringify(req.body, null, 2);
        const base64 = Buffer.from(jsonString).toString("base64");
        
        const resp = await enviarParaGithub("dados/agendamento.json", base64, "Sincronização Agenda");

        if (resp.ok) return res.json({ ok: true });

        const erroGithub = await resp.json();
        console.error("ERRO DO GITHUB:", erroGithub); // VEJA ISSO NOS LOGS DO RENDER
        res.status(500).json({ erro: "Github recusou", detalhes: erroGithub });
    } catch (err) {
        console.error("ERRO NO SERVIDOR:", err);
        res.status(500).json({ erro: err.message });
    }
});

// ROTA DE CONTRATOS
app.post("/upload", async (req, res) => {
    try {
        const { nomeArquivo, conteudoBase64 } = req.body;
        const resp = await enviarParaGithub(`dados/fichas/${nomeArquivo}`, conteudoBase64, `Contrato: ${nomeArquivo}`);
        if (resp.ok) return res.json({ ok: true });
        res.status(500).json(await resp.json());
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(PORT, () => console.log("Servidor Online!"));
