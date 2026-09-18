const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Banco de dados simples persistente em arquivo ou fallback em memória
const DATA_FILE = path.join(process.env.VERCEL ? "/tmp" : __dirname, "data.json");

let db = {
  alarms: [
    { id: "1", time: "07:00", label: "Despertar Matinal", active: false },
    { id: "2", time: "12:30", label: "Horário do Almoço", active: true },
  ],
  stopwatchHistory: [],
};

// Carrega os dados se o arquivo existir
if (fs.existsSync(DATA_FILE)) {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    db = JSON.parse(raw);
  } catch (err) {
    console.error("Erro ao ler data.json:", err.message);
  }
}

function saveData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), "utf8");
  } catch (err) {
    console.error("Erro ao salvar data.json:", err.message);
  }
}

// Rotas da API REST

// GET Alarmes
app.get("/api/alarms", (req, res) => {
  res.json({ success: true, alarms: db.alarms });
});

// POST Novo Alarme
app.post("/api/alarms", (req, res) => {
  const { time, label } = req.body;
  if (!time) {
    return res
      .status(400)
      .json({ success: false, message: "Horário é obrigatório" });
  }

  const newAlarm = {
    id: Date.now().toString(),
    time: time.trim(),
    label: label && label.trim() ? label.trim() : "Alarme Sem Título",
    active: true,
  };

  db.alarms.push(newAlarm);
  saveData();

  res.status(201).json({ success: true, alarm: newAlarm });
});

// PATCH Alternar Estado do Alarme
app.patch("/api/alarms/:id", (req, res) => {
  const { id } = req.params;
  const alarm = db.alarms.find((a) => a.id === id);
  if (!alarm) {
    return res
      .status(404)
      .json({ success: false, message: "Alarme não encontrado" });
  }

  if (typeof req.body.active === "boolean") {
    alarm.active = req.body.active;
  } else {
    alarm.active = !alarm.active;
  }

  saveData();
  res.json({ success: true, alarm });
});

// DELETE Alarme
app.delete("/api/alarms/:id", (req, res) => {
  const { id } = req.params;
  const index = db.alarms.findIndex((a) => a.id === id);
  if (index === -1) {
    return res
      .status(404)
      .json({ success: false, message: "Alarme não encontrado" });
  }

  const deleted = db.alarms.splice(index, 1)[0];
  saveData();
  res.json({ success: true, deleted });
});

// GET Histórico do Cronômetro
app.get("/api/history", (req, res) => {
  res.json({ success: true, history: db.stopwatchHistory });
});

// POST Salvar Sessão do Cronômetro
app.post("/api/history", (req, res) => {
  const { sessionName, duration, laps } = req.body;
  if (!laps || !Array.isArray(laps)) {
    return res
      .status(400)
      .json({ success: false, message: "Formato inválido de histórico" });
  }

  const record = {
    id: Date.now().toString(),
    date: new Date().toISOString(),
    sessionName: sessionName || `Sessão #${db.stopwatchHistory.length + 1}`,
    totalDuration: duration || "00:00.00",
    laps,
  };

  db.stopwatchHistory.unshift(record);
  // Mantém as últimas 50 sessões
  if (db.stopwatchHistory.length > 50) {
    db.stopwatchHistory = db.stopwatchHistory.slice(0, 50);
  }

  saveData();
  res.status(201).json({ success: true, record });
});

// DELETE Limpar Histórico
app.delete("/api/history", (req, res) => {
  db.stopwatchHistory = [];
  saveData();
  res.json({ success: true, message: "Histórico limpo" });
});

// Endpoint de verificação de status (Health Check)
app.get("/api/status", (req, res) => {
  res.json({
    status: "online",
    serverTime: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Rota de fallback para aplicação de página única (SPA)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`===================================================`);
    console.log(` Servidor Relógio Digital em execução na porta ${PORT}`);
    console.log(` Acesse: http://localhost:${PORT}`);
    console.log(`===================================================`);
  });
}

module.exports = app;
