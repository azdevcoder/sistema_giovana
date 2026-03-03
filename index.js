import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configurações via Variáveis de Ambiente ou Padrão
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "https://azdevcoder.github.io";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
// Verifique se o nome abaixo está correto para os dois serviços
const GITHUB_REPO = process.env.GITHUB_REPO || "azdevcoder/sistema_giovana"; 
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";

if (!GITHUB_TOKEN) {
  console.error("Falta a variável de ambiente GITHUB_TOKEN.");
  process.exit(1);
}

// CORS ajustado para aceitar requisições do seu GitHub Pages e testes locais
app.use(cors({ origin: "*" })); 
app.use(express.json({ limit: "30mb" }));

app.get("/health", (req, res) => res.json({ ok: true }));

// --- SERVIÇO 1: CONTRATOS (MANTIDO INTEGRALMENTE) ---
app.post("/upload", async (req, res) => {
    try {
        const { nomeArquivo, conteudoBase64 } = req.body;
        if (!nomeArquivo || !conteudoBase64) {
            return res.status(400).json({ error: "Dados incompletos" });
        }

        const path = `dados/fichas/${nomeArquivo}`;
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

// --- ROTA PARA AGENDAMENTOS (VERSÃO REPARADORA) ---
app.post("/salvar", async (req, res) => {
  try {
    const eventos = req.body; 
    const path = "dados/agendamento.json";
    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`;

    // 1. SEMPRE busca a versão mais atual do arquivo para evitar Erro 500/409
    const getResp = await fetch(`${url}?t=${Date.now()}`, { // t=Date.now evita cache
      headers: { Authorization: `token ${GITHUB_TOKEN}` }
    });

    let sha;
    if (getResp.ok) {
      const getJson = await getResp.json();
      sha = getJson.sha;
    }

    // 2. Transforma os dados em Base64 corretamente
    const jsonString = JSON.stringify(eventos, null, 2);
    const conteudoBase64 = Buffer.from(jsonString, 'utf-8').toString('base64');

    // 3. Monta o corpo da requisição
    const body = {
      message: "Sincronização agenda",
      content: conteudoBase64,
      branch: GITHUB_BRANCH
    };
    
    // Se o arquivo existe, envia o SHA. Se não existe, o GitHub criará um novo.
    if (sha) {
      body.sha = sha;
    }

    const putResp = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (putResp.ok) {
      console.log("Agenda salva com sucesso no GitHub");
      return res.json({ ok: true });
    } else {
      const errorJson = await putResp.json();
      console.error("Erro detalhado do GitHub:", errorJson);
      return res.status(500).json({ error: "Erro no GitHub", details: errorJson });
    }

  } catch (err) {
    console.error("Erro fatal no servidor:", err);
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor AzDev rodando na porta ${PORT}`);
});
