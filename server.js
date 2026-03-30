import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.EORBIT_BASE_URL;
const LOGIN = process.env.EORBIT_LOGIN;
const SENHA = process.env.EORBIT_SENHA;

function maskToken(token) {
  if (!token || token.length < 12) return "[token-curto]";
  return `${token.slice(0, 6)}***${token.slice(-6)}`;
}

async function getToken() {
  const authUrl =
    `${BASE_URL}/auth.php?login=${encodeURIComponent(LOGIN)}&senha=${encodeURIComponent(SENHA)}`;

  const response = await fetch(authUrl, { method: "POST" });
  const raw = await response.text();
  const token = raw.trim();

  if (!response.ok) {
    throw new Error(`Auth HTTP ${response.status}: ${raw}`);
  }

  if (!token || token.toLowerCase().includes("credenciais incorretas")) {
    throw new Error(`Falha na autenticação: ${raw}`);
  }

  console.log("[AUTH] status:", response.status, "| token:", maskToken(token));
  return token;
}

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/api/eorbit/test-auth", async (req, res) => {
  try {
    const token = await getToken();
    res.json({
      ok: true,
      tokenPreview: maskToken(token),
      tokenLength: token.length
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      stage: "auth",
      error: error.message
    });
  }
});

app.get("/api/eorbit/cursos", async (req, res) => {
  try {
    const token = await getToken();

    const response = await fetch(`${BASE_URL}/cursos.php`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const raw = await response.text();

    console.log("[CURSOS] status:", response.status);
    console.log("[CURSOS] body:", raw);

    try {
      return res.status(response.status).json(JSON.parse(raw));
    } catch {
      return res.status(response.status).send(raw);
    }
  } catch (error) {
    return res.status(500).json({
      ok: false,
      stage: "cursos",
      error: error.message
    });
  }
});

app.post("/api/eorbit/matricula", async (req, res) => {
  try {
    const token = await getToken();

    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(req.body)) {
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        params.append(key, String(value).trim());
      }
    }

    const response = await fetch(`${BASE_URL}/aluno.php?${params.toString()}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const raw = await response.text();

    console.log("[MATRICULA] status:", response.status);
    console.log("[MATRICULA] body:", raw);

    return res.status(response.status).send(raw);
  } catch (error) {
    return res.status(500).json({
      ok: false,
      stage: "matricula",
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});