import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "https://azdevcoder.github.io";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || "azdevcoder/sistemas-giovana"; 
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";

if (!GITHUB_TOKEN) {
  console.error("Falta a variável de ambiente GITHUB_TOKEN.");
  process.exit(1);
}

app.use(cors({ origin: FRONTEND_ORIGIN }));
app.use(express.json({ limit: "30mb" }));

app.get("/health", (req, res) => res.json({ ok: true }));

// --- ROTA PARA CONTRATOS ---
app.post("/upload", async (req, res) => {
    try {
        const { nomeArquivo, conteudoBase64 } = req.body;
        if (!nomeArquivo || !conteudoBase64) {
            return res.status(400).json({ error: "Dados incompletos" });
        }

        const path = `dados/${nomeArquivo}`;
        const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${encodeURIComponent(path)}`;

        const getResp = await fetch(url, {
            headers: { Authorization: `token ${GITHUB_TOKEN}` }
        });
        let sha;
        if (getResp.ok) {
            const getJson = await getResp.json();
            sha = getJson.sha;
        }

        const putResp = await fetch(url, {
            method: "PUT",
            headers: {
                Authorization: `token ${GITHUB_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: `Upload de contrato: ${nomeArquivo}`,
                content: conteudoBase64,
                sha: sha,
                branch: GITHUB_BRANCH
            })
        });

        if (putResp.ok) return res.json({ ok: true });
        const errData = await putResp.json();
        return res.status(500).json({ error: "Erro no GitHub", details: errData });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro interno" });
    }
});

// --- ROTA PARA AGENDAMENTOS (JSON) ---
app.post("/salvar-agenda", async (req, res) => {
  try {
    const eventos = req.body; 
    const path = `dados/agendamentos.json`;
    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${encodeURIComponent(path)}`;

    const getResp = await fetch(url, {
      headers: { Authorization: `token ${GITHUB_TOKEN}` }
    });

    let sha;
    if (getResp.ok) {
      const getJson = await getResp.json();
      sha = getJson.sha;
    }

    const jsonString = JSON.stringify(eventos, null, 2);
    const conteudoBase64 = Buffer.from(jsonString, 'utf-8').toString('base64');

    const body = {
      message: "Sincronização automática de agendamentos",
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

    if (putResp.ok) {
      return res.json({ ok: true, message: "Agenda sincronizada" });
    } else {
      const errorJson = await putResp.json();
      return res.status(500).json({ error: "Erro no GitHub", details: errorJson });
    }

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor AzDev rodando na porta ${PORT}`);
});
