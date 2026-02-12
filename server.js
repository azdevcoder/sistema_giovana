import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "https://psigiovana.azdevcoder.com.br";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || "/sistema_giovana";
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";

if (!GITHUB_TOKEN) {
  console.error("Falta a variável de ambiente GITHUB_TOKEN.");
  process.exit(1);
}

app.use(cors({ origin: FRONTEND_ORIGIN }));
app.use(express.json({ limit: "30mb" }));

// Rota de Health Check
app.get("/health", (req, res) => res.json({ ok: true }));

// --- BUSCAR CONTRATOS (LISTAR OU ARQUIVO ESPECÍFICO) ---
app.get("/contratos/contratos-assinados/:nomeArquivo?", async (req, res) => {
  try {
    const { nomeArquivo } = req.params;
    const path = nomeArquivo ? `contratos/contratos-assinados/${nomeArquivo}` : `contratos`;
    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${encodeURIComponent(path)}?ref=${GITHUB_BRANCH}`;

    const resp = await fetch(url, {
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json"
      }
    });

    const data = await resp.json();
    if (!resp.ok) return res.status(resp.status).json(data);
    
    return res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar contratos" });
  }
});

// --- UPLOAD DE CONTRATOS ---
app.post("/upload", async (req, res) => {
  try {
    const { nomeArquivo, conteudoBase64 } = req.body;
    if (!nomeArquivo || !conteudoBase64) return res.status(400).json({ error: "Dados incompletos" });

    const path = `contratos/${nomeArquivo}`;
    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${encodeURIComponent(path)}`;

    // Verificar se existe para pegar o SHA
    const getResp = await fetch(url, { headers: { Authorization: `token ${GITHUB_TOKEN}` } });
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
        message: `Upload contrato: ${nomeArquivo}`,
        content: conteudoBase64,
        sha,
        branch: GITHUB_BRANCH
      })
    });

    if (putResp.ok) return res.json({ ok: true });
    const errData = await putResp.json();
    res.status(500).json(errData);
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

app.listen(PORT, () => console.log(`Servidor Contratos rodando na porta ${PORT}`));
