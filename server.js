import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch"; // Garanta que o node-fetch esteja instalado ou use o nativo do Node 18+

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || "azdevcoder/sistema_giovana";
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";

if (!GITHUB_TOKEN) {
  console.error("ERRO: GITHUB_TOKEN não configurado.");
  process.exit(1);
}

app.use(cors());
app.use(express.json({ limit: "50mb" })); // Aumentado para suportar PDFs maiores

// Rota de Health Check
app.get("/health", (req, res) => res.json({ status: "AzDev Server Online" }));

// --- FUNÇÃO GENÉRICA PARA GITHUB ---
async function uploadToGithub(path, contentBase64, message) {
  const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`;
  
  // Tentar buscar o SHA se o arquivo já existir
  const getResp = await fetch(url + `?ref=${GITHUB_BRANCH}`, {
    headers: { Authorization: `token ${GITHUB_TOKEN}` }
  });
  
  let sha;
  if (getResp.ok) {
    const data = await getResp.json();
    sha = data.sha;
  }

  const putResp = await fetch(url, {
    method: "PUT",
    headers: { 
      Authorization: `token ${GITHUB_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message,
      content: contentBase64,
      sha,
      branch: GITHUB_BRANCH
    })
  });

  return putResp;
}

// --- ROTA: SALVAR AGENDA (JSON) ---
app.post("/salvar-agenda", async (req, res) => {
  try {
    const conteudo = Buffer.from(JSON.stringify(req.body, null, 2)).toString('base64');
    const resp = await uploadToGithub("dados/agendamento.json", conteudo, "Sincronização de agenda");
    
    if (resp.ok) return res.json({ ok: true });
    res.status(500).json(await resp.json());
  } catch (err) {
    res.status(500).json({ error: "Erro interno na agenda" });
  }
});

// --- ROTA: UPLOAD DE PDFs (Contratos e Fichas) ---
app.post("/upload", async (req, res) => {
  try {
    const { nomeArquivo, conteudoBase64, tipo } = req.body; // 'tipo' pode ajudar a organizar pastas
    const pasta = tipo === 'ficha' ? 'dados/fichas' : 'contratos/contratos-assinados';
    const path = `${pasta}/${nomeArquivo}`;

    const resp = await uploadToGithub(path, conteudoBase64, `Upload: ${nomeArquivo}`);

    if (resp.ok) return res.json({ ok: true });
    res.status(500).json(await resp.json());
  } catch (err) {
    res.status(500).json({ error: "Erro interno no upload" });
  }
});

app.listen(PORT, () => console.log(`Servidor AzDev Coder rodando na porta ${PORT}`));
