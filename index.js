import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001; // Porta diferente se rodar no mesmo PC

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "https://azdevcoder.github.io";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || "azdevcoder/sistema_giovana";
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";

if (!GITHUB_TOKEN) {
  console.error("Falta GITHUB_TOKEN.");
  process.exit(1);
}

app.use(cors({ origin: FRONTEND_ORIGIN }));
app.use(express.json({ limit: "30mb" }));

// --- BUSCAR FICHAS ---
app.get("/dados/fichas/:nomeFicha?", async (req, res) => {
  try {
    const { nomeFicha } = req.params;
    const path = nomeFicha ? `dados/fichas/${nomeFicha}` : `dados/fichas`;
    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${encodeURIComponent(path)}?ref=${GITHUB_BRANCH}`;

    const resp = await fetch(url, { headers: { Authorization: `token ${GITHUB_TOKEN}` } });
    const data = await resp.json();
    
    if (!resp.ok) return res.status(resp.status).json(data);
    return res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar fichas" });
  }
});

// --- SALVAR AGENDAMENTOS (JSON) ---
app.post("/salvar-agenda", async (req, res) => {
  try {
    const eventos = req.body;
    const path = `dados/agendamento.json`;
    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${encodeURIComponent(path)}`;

    const getResp = await fetch(url, { headers: { Authorization: `token ${GITHUB_TOKEN}` } });
    let sha;
    if (getResp.ok) {
      const getJson = await getResp.json();
      sha = getJson.sha;
    }

    const conteudoBase64 = Buffer.from(JSON.stringify(eventos, null, 2)).toString('base64');

    const putResp = await fetch(url, {
      method: "PUT",
      headers: { Authorization: `token ${GITHUB_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Sincronização de agenda",
        content: conteudoBase64,
        sha,
        branch: GITHUB_BRANCH
      })
    });

    if (putResp.ok) return res.json({ ok: true });
    res.status(500).json(await putResp.json());
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

app.listen(PORT, () => console.log(`Servidor AzDev rodando na porta ${PORT}`));
