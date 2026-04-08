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
// SENHA QUE VOCÊ VAI CADASTRAR NO RENDER (Environment Variables)
const SENHA_MESTRA = process.env.SENHA_SISTEMA || "251224"; 

app.use(cors());
app.use(express.json({ limit: "50mb" }));

// Função auxiliar existente (mantida intacta)
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

// --- ROTA EXISTENTE (NÃO ALTERADA) ---
app.post("/upload-ficha", async (req, res) => {
    try {
        const { nomeArquivo, conteudoBase64 } = req.body;
        const path = `dados/fichas/${nomeArquivo}`; 
        const response = await salvarNoGithub(path, conteudoBase64, `Nova Ficha: ${nomeArquivo}`);
        if (response.ok) return res.json({ ok: true });
        const err = await response.json();
        res.status(500).json({ error: "Erro GitHub", details: err });
    } catch (err) {
        res.status(500).json({ error: "Erro Interno" });
    }
});

// --- NOVAS ROTAS PARA RELATOS ---

// 1. Salvar Relato
app.post("/api/salvar-relato", async (req, res) => {
    const { paciente, data, relato, senha, arquivoNome, arquivoDados } = req.body;

    // Validação de Senha
    if (senha !== SENHA_MESTRA) {
        return res.status(401).json({ message: "Senha incorreta!" });
    }

    try {
        // Criamos um JSON com o relato para salvar como arquivo .json no GitHub
        const dadosRelato = {
            paciente,
            data,
            relato,
            arquivoAnexo: arquivoNome || null
        };
        
        const conteudoBase64 = Buffer.from(JSON.stringify(dadosRelato, null, 2)).toString('base64');
        const nomeArquivoJson = `relato_${data}_${paciente.replace(/\s+/g, '_')}.json`;
        const path = `dados/relatos/${nomeArquivoJson}`;

        const response = await salvarNoGithub(path, conteudoBase64, `Novo Relato: ${paciente}`);

        // Se houver arquivo anexo (doc/txt), salva ele também em uma pasta separada
        if (arquivoDados && arquivoNome) {
            const pathAnexo = `dados/relatos/anexos/${data}_${arquivoNome}`;
            await salvarNoGithub(pathAnexo, arquivoDados, `Anexo de: ${paciente}`);
        }

        if (response.ok) return res.json({ ok: true });
        res.status(500).json({ error: "Erro ao salvar no GitHub" });
    } catch (err) {
        res.status(500).json({ error: "Erro Interno" });
    }
});

// 2. Listar Relatos (Lê a pasta do GitHub e retorna os nomes)
app.post("/api/listar-relatos", async (req, res) => {
    const { senha } = req.body;
    if (senha !== SENHA_MESTRA) return res.status(401).json({ message: "Acesso Negado" });

    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/dados/relatos`;

    try {
        const response = await fetch(url, {
            headers: { Authorization: `token ${GITHUB_TOKEN}` }
        });
        
        if (!response.ok) return res.json([]); // Retorna vazio se a pasta não existir ainda

        const arquivos = await response.json();
        
        // Filtra apenas os arquivos .json (os relatos)
        const relatos = arquivos
            .filter(file => file.name.endsWith('.json'))
            .map(file => ({
                nome: file.name,
                urlGithub: file.html_url,
                // Extrai data e nome do título do arquivo (ex: relato_2026-04-07_Andre.json)
                paciente: file.name.split('_')[2].replace('.json', ''),
                data: file.name.split('_')[1]
            }));

        res.json(relatos);
    } catch (err) {
        res.status(500).json({ error: "Erro ao buscar lista" });
    }
});

app.get("/", (req, res) => res.send("Servidor AzDev Coder Ativo"));
app.listen(PORT, "0.0.0.0", () => console.log(`Rodando na porta ${PORT}`));
