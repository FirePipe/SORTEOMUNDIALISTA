import express from "express";
import path from "path";
import http from "http";
import { Server } from "socket.io";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";
import cors from "cors";
import crypto from "crypto";
import ExcelJS from "exceljs";
import { db } from "./server_db.js";

let _filename = "";
let _dirname = "";
try {
  if (typeof import.meta !== "undefined" && import.meta.url) {
    _filename = fileURLToPath(import.meta.url);
    _dirname = path.dirname(_filename);
  } else {
    _filename = typeof __filename !== "undefined" ? __filename : "";
    _dirname = typeof __dirname !== "undefined" ? __dirname : "";
  }
} catch {
  _filename = "";
  _dirname = "";
}

const JWT_SECRET = process.env.JWT_SECRET || "sorteo-champions-league-tesla-apple-super-secret-key-99";

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  
  app.use(cors({ origin: "*" }));
  app.use(express.json({ limit: "50mb" })); // support large excel uploads
  
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  // Broadcast function
  const broadcastState = async () => {
    const state = await db.getState();
    const config = await db.getConfig();
    const participants = await db.getParticipants();
    io.emit("state:changed", { state, config, participantsCount: participants.length });
  };

  const broadcastParticipants = async () => {
    const participants = await db.getParticipants();
    io.emit("participants:changed", participants);
  };

  // JWT Helper / Middleware
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Access token missing" });
    }

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) {
        return res.status(403).json({ error: "Invalid or expired token" });
      }
      req.user = user;
      next();
    });
  };

  // --- API ROUTES ---

  // Auth
  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    // 1. Check environment variables & hardcoded admin fallbacks first
    // (This ensures login always works, even if MongoDB is starting up, empty, or unreachable)
    const envAdminUser = process.env.ADMIN_USER || "admin@sos.com.co";
    const envAdminPass = process.env.ADMIN_PASSWORD || process.env.ADMIN_PASS || "FiebreMundial2026";

    const isEnvAdmin = username === envAdminUser && password === envAdminPass;
    const isLegacyAdmin = username === "admin" && password === "admin123";
    const isSorteoAdmin = username === "mundialsorteo@sos.com.co" && password === "FiebreMundial2026";
    const isBackupAdmin = username === "admin@sos.com.co" && password === "FiebreMundial2026";

    let loginSuccessful = false;

    if (isEnvAdmin || isLegacyAdmin || isSorteoAdmin || isBackupAdmin) {
      loginSuccessful = true;
    } else {
      // 2. Query Database as a fallback
      try {
        const user = await db.findUser(username);
        if (user) {
          const inputHash = crypto.createHash("sha256").update(password).digest("hex");
          if (user.passwordHash === inputHash) {
            loginSuccessful = true;
          }
        }
      } catch (err) {
        console.error("Database authentication query failed:", err);
      }
    }

    if (loginSuccessful) {
      const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: "12h" });
      
      try {
        await db.addLog({
          accion: "LOGIN",
          detalles: `El administrador ${username} ingresó al sistema`,
          usuario: username,
          ip: req.ip || req.headers["x-forwarded-for"]?.toString() || "127.0.0.1"
        });
      } catch (err) {
        console.error("Failed to add audit log for login:", err);
      }

      return res.json({ token, username });
    }

    return res.status(401).json({ error: "Invalid credentials" });
  });

  // Verify Token
  app.get("/api/auth/verify", authenticateToken, (req: any, res: any) => {
    res.json({ valid: true, user: req.user });
  });

  // Participants CRUD
  app.get("/api/participants", async (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      const participants = await db.getParticipants();
      res.json(participants);
    } catch (e: any) {
      console.error("Failed to fetch participants:", e);
      res.status(500).json({ error: "Failed to fetch participants" });
    }
  });

  app.post("/api/participants", authenticateToken, async (req: any, res: any) => {
    try {
      const { nombre, apellido, equipo, area, pago, participa, medioPago, valor } = req.body;
      if (!nombre || !apellido) {
        return res.status(400).json({ error: "Nombre and apellido are required" });
      }

      const newParticipant = await db.addParticipant({
        nombre,
        apellido,
        equipo: equipo || "",
        area: area || "",
        pago: !!pago,
        participa: participa !== false,
        numeroAsignado: null,
        medioPago: medioPago || "",
        valor: Number(valor) || 0
      });

      await db.addLog({
        accion: "CREACION_PARTICIPANTE",
        detalles: `Se registró manualmente al participante: ${nombre} ${apellido}`,
        usuario: req.user.username,
        ip: req.ip || "127.0.0.1"
      });

      await broadcastParticipants();
      await broadcastState();
      res.status(201).json(newParticipant);
    } catch (e: any) {
      console.error("Failed to create participant:", e);
      res.status(500).json({ error: "Failed to create participant" });
    }
  });

  app.put("/api/participants/:id", authenticateToken, async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const update = req.body;

      const updated = await db.updateParticipant(id, update);
      if (!updated) {
        return res.status(404).json({ error: "Participant not found" });
      }

      await db.addLog({
        accion: "EDICION_PARTICIPANTE",
        detalles: `Se editó al participante ${updated.nombre} ${updated.apellido}`,
        usuario: req.user.username,
        ip: req.ip || "127.0.0.1"
      });

      await broadcastParticipants();
      await broadcastState();
      res.json(updated);
    } catch (e: any) {
      console.error("Failed to update participant:", e);
      res.status(500).json({ error: "Failed to update participant" });
    }
  });

  app.delete("/api/participants/:id", authenticateToken, async (req: any, res: any) => {
    try {
      const { id } = req.params;
      await db.deleteParticipant(id);

      await db.addLog({
        accion: "ELIMINACION_PARTICIPANTE",
        detalles: `Se eliminó al participante con ID: ${id}`,
        usuario: req.user.username,
        ip: req.ip || "127.0.0.1"
      });

      await broadcastParticipants();
      await broadcastState();
      res.json({ success: true });
    } catch (e: any) {
      console.error("Failed to delete participant:", e);
      res.status(500).json({ error: "Failed to delete participant" });
    }
  });

  // Bulk Excel Import
  app.post("/api/participants/import", authenticateToken, async (req: any, res: any) => {
    const { fileBase64 } = req.body;
    if (!fileBase64) {
      return res.status(400).json({ error: "Excel base64 content required" });
    }

    try {
      const buffer = Buffer.from(fileBase64, "base64");
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      const worksheet = workbook.worksheets[0];
      const importedParticipants: any[] = [];
      
      // Override or append? We'll replace the existing list with the newly imported
      await db.ParticipantModel.deleteMany({});
      
      const newAssignedNumbers = new Set<string>();

      worksheet.eachRow((row, rowNumber) => {
        // Skip header row
        if (rowNumber === 1) return;

        const nombre = row.getCell(1).value?.toString()?.trim();
        const apellido = row.getCell(2).value?.toString()?.trim();
        const equipo = row.getCell(3).value?.toString()?.trim() || "";
        const area = row.getCell(4).value?.toString()?.trim() || "";
        
        const pagoRaw = row.getCell(5).value?.toString()?.trim()?.toUpperCase();
        // Normalize accented "SÍ" to "SI"
        const normalizedPagoRaw = pagoRaw?.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const pago = normalizedPagoRaw === "SI" || pagoRaw === "YES" || pagoRaw === "TRUE" || pagoRaw === "PAGADO" || row.getCell(5).value === true;
        
        const participaRaw = row.getCell(6).value?.toString()?.trim()?.toUpperCase();
        const normalizedParticipaRaw = participaRaw?.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const participa = normalizedParticipaRaw === "SI" || participaRaw === "YES" || participaRaw === "TRUE" || row.getCell(6).value === true;

        const numeroAsignadoRaw = row.getCell(7).value?.toString()?.trim();
        let numeroAsignado = null;
        let fechaAsignacion = undefined;

        if (numeroAsignadoRaw && /^\d+$/.test(numeroAsignadoRaw)) {
          numeroAsignado = numeroAsignadoRaw.padStart(2, "0");
          fechaAsignacion = new Date().toISOString();
          newAssignedNumbers.add(numeroAsignado);
        }

        const medioPago = row.getCell(8).value?.toString()?.trim() || "";
        const valor = Number(row.getCell(9).value) || 0;

        if (nombre && apellido) {
          importedParticipants.push({
            nombre,
            apellido,
            equipo,
            area,
            pago,
            participa,
            numeroAsignado,
            fechaAsignacion,
            medioPago,
            valor
          });
        }
      });

      await db.ParticipantModel.insertMany(importedParticipants);

      // Rebuild the state based on the current config and the newly imported assigned numbers
      let st = await db.StateModel.findOne({});
      if (st) {
        const min = st.config?.rangoMin || 1;
        const max = st.config?.rangoMax || 99;
        const habilitar00 = st.config?.habilitar00 ?? true;
        
        const newPool: string[] = [];
        if (habilitar00) newPool.push("00");
        for (let i = min; i <= max; i++) {
          newPool.push(String(i).padStart(2, "0"));
        }
        
        const availablePool = newPool.filter(n => !newAssignedNumbers.has(n));
        const assignedArray = Array.from(newAssignedNumbers);

        st.estado = "LISTO";
        st.participanteActualId = null;
        st.numeroPropuesto = null;
        st.numerosDisponibles = availablePool;
        st.numerosAsignados = assignedArray;
        st.descartadosEnEsteIntento = [];
        if (st.config) {
          st.config.modoShow = false;
          st.config.showCountdown = 0;
        }
        await st.save();
      }

      await db.addLog({
        accion: "IMPORTACION",
        detalles: `Se importaron ${importedParticipants.length} participantes y se restauraron ${newAssignedNumbers.size} resultados desde archivo Excel`,
        usuario: req.user.username,
        ip: req.ip || "127.0.0.1"
      });

      await broadcastParticipants();
      await broadcastState();
      res.json({ success: true, count: importedParticipants.length, restored: newAssignedNumbers.size });
    } catch (e: any) {
      console.error("Excel import failure:", e);
      res.status(500).json({ error: "Failed to parse Excel file: " + e.message });
    }
  });

  // Get configuration
  app.get("/api/config", async (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      const config = await db.getConfig();
      res.json(config);
    } catch (e: any) {
      console.error("Failed to fetch config:", e);
      res.status(500).json({ error: "Failed to fetch config" });
    }
  });

  // Update configuration
  app.put("/api/config", authenticateToken, async (req: any, res: any) => {
    try {
      const updated = await db.updateConfig(req.body);
      await db.addLog({
        accion: "CONFIGURACION_MODIFICADA",
        detalles: "Se actualizó la configuración general del evento",
        usuario: req.user.username,
        ip: req.ip || "127.0.0.1"
      });
      await broadcastState();
      res.json(updated);
    } catch (e: any) {
      console.error("Failed to update config:", e);
      res.status(500).json({ error: "Failed to update config" });
    }
  });

  // Get current event state
  app.get("/api/event/state", async (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      const state = await db.getState();
      res.json(state);
    } catch (e: any) {
      console.error("Failed to fetch event state:", e);
      res.status(500).json({ error: "Failed to fetch event state" });
    }
  });

  // Get database connection status (MongoDB vs Local JSON fallback)
  app.get("/api/db/status", async (req, res) => {
    try {
      const status = await db.getMongoStatus();
      res.json(status);
    } catch (e: any) {
      res.status(500).json({ connected: false, error: e.message || String(e) });
    }
  });

  // Update event status (LISTO, EJECUTANDO, PAUSADO, FINALIZADO)
  app.post("/api/event/status", authenticateToken, async (req: any, res: any) => {
    const { estado } = req.body;
    if (!["LISTO", "EJECUTANDO", "PAUSADO", "FINALIZADO"].includes(estado)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const state = await db.updateState({ estado });
    
    await db.addLog({
      accion: estado,
      detalles: `El estado del evento cambió a: ${estado}`,
      usuario: req.user.username,
      ip: req.ip || "127.0.0.1"
    });

    await broadcastState();
    res.json(state);
  });

  // Algoritmo de Asignación: Fisher-Yates shuffle helper
  const shuffleArray = (array: string[]) => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  // Roll single random number for participant (Suspensful drawing)
  app.post("/api/event/roll", authenticateToken, async (req: any, res: any) => {
    const { participanteId } = req.body;
    if (!participanteId) {
      return res.status(400).json({ error: "Participant ID required" });
    }

    const state = await db.getState();
    const participants = await db.getParticipants();
    
    // Safety lock: Don't allow multiple simultaneous rolls
    if (state.estado === "EJECUTANDO") {
      return res.status(400).json({ error: "A draw is already in progress. Wait for it to finish." });
    }

    const participant = participants.find(p => p._id?.toString() === participanteId || p.id?.toString() === participanteId);
    if (!participant) {
      return res.status(404).json({ error: "Participant not found" });
    }

    // Source of truth for assigned numbers
    const actuallyAssigned = new Set(participants.filter(p => p.numeroAsignado).map(p => p.numeroAsignado!));
    
    // Exclude assigned numbers AND currently discarded numbers in this attempt
    const excludedNumbers = new Set([
      ...actuallyAssigned,
      ...state.descartadosEnEsteIntento
    ]);

    const remainingPool = state.numerosDisponibles.filter(num => !excludedNumbers.has(num));

    if (remainingPool.length === 0) {
      return res.status(400).json({ error: "No physical numbers available in requested range" });
    }

    let chosenNumber;
    // Si hay un número ganador programado y aún está disponible, forzarlo a que salga
    if (state.config?.numeroGanador && remainingPool.includes(state.config.numeroGanador)) {
      chosenNumber = state.config.numeroGanador;
    } else {
      // Fisher-Yates pick
      const shuffled = shuffleArray(remainingPool);
      chosenNumber = shuffled[0];
    }

    // Update state to track selection proposing
    const updatedState = await db.updateState({
      participanteActualId: participanteId,
      numeroPropuesto: chosenNumber,
      estado: "EJECUTANDO"
    });

    // Generate custom random pre-roll sequence for UI flashing
    // Fill sequence with random available numbers to flashing
    // Ensure a minimum of 12 steps for better visual "drama"
    const minSteps = 12;
    let flashShuffled: string[] = [];
    
    if (remainingPool.length >= minSteps) {
      flashShuffled = shuffleArray(remainingPool).slice(0, minSteps);
    } else {
      // If pool is small, repeat some numbers to maintain animation length
      flashShuffled = [];
      for (let i = 0; i < minSteps; i++) {
        flashShuffled.push(remainingPool[Math.floor(Math.random() * remainingPool.length)]);
      }
    }

    if (!flashShuffled.includes(chosenNumber)) {
      flashShuffled[flashShuffled.length - 1] = chosenNumber; // guarantee final targets chosen
    } else {
      // Move chosenNumber to the end
      const idx = flashShuffled.indexOf(chosenNumber);
      flashShuffled.splice(idx, 1);
      flashShuffled.push(chosenNumber);
    }

    await db.addLog({
      accion: "PRE_ASIGNACION",
      detalles: `Generando propuesta de asignación para: ${participant.nombre} ${participant.apellido}`,
      usuario: req.user.username,
      ip: req.ip || "127.0.0.1"
    });

    await broadcastState();
    
    // Broadcast specialized roll animation triggers
    io.emit("event:rolling", {
      participantName: `${participant.nombre} ${participant.apellido}`,
      sequence: flashShuffled,
      targetNumber: chosenNumber
    });

    res.json({
      chosenNumber,
      sequence: flashShuffled,
      state: updatedState
    });
  });

  // Reroll/Relanzar proposed number (Discards proposed, adds to attempt's discarded set)
  app.post("/api/event/reroll", authenticateToken, async (req: any, res: any) => {
    const state = await db.getState();
    if (!state.numeroPropuesto || !state.participanteActualId) {
      return res.json({ success: true, state, message: "No proposed assignment to reroll" });
    }

    const discarded = state.numeroPropuesto;
    const participantId = state.participanteActualId;
    const updatedDiscards = [...state.descartadosEnEsteIntento, discarded];

    const updatedState = await db.updateState({
      numeroPropuesto: null,
      descartadosEnEsteIntento: updatedDiscards,
      estado: "LISTO"
    });

    const participants = await db.getParticipants();
    const p = participants.find(part => part._id?.toString() === participantId || part.id?.toString() === participantId);

    await db.addLog({
      accion: "RELANZAMIENTO",
      detalles: `Número ${discarded} descartado para ${p ? p.nombre + " " + p.apellido : "participante"}`,
      usuario: req.user.username,
      ip: req.ip || "127.0.0.1"
    });

    await broadcastState();
    io.emit("event:rerolled", { discardedNumber: discarded, state: updatedState });

    res.json({ success: true, state: updatedState });
  });

  // Confirm proposed assignment
  app.post("/api/event/confirm", authenticateToken, async (req: any, res: any) => {
    const state = await db.getState();
    if (!state.numeroPropuesto || !state.participanteActualId) {
      return res.json({ success: true, state, message: "No proposed assignment to confirm" });
    }

    const confirmedNumber = state.numeroPropuesto;
    const participantId = state.participanteActualId;

    // Persist assigned number to the participant
    const updatedParticipant = await db.updateParticipant(participantId, {
      numeroAsignado: confirmedNumber,
      fechaAsignacion: new Date().toISOString()
    });

    if (!updatedParticipant) {
      return res.status(404).json({ error: "Target participant not found" });
    }

    // Lock number in state: remove from available, add to assigned, reset attempt discards
    const availableLeft = state.numerosDisponibles.filter(num => num !== confirmedNumber);
    
    // Recalculate assigned list from all participants to ensure perfect sync
    const allParticipants = await db.getParticipants();
    const assignedList = allParticipants.filter(p => p.numeroAsignado).map(p => p.numeroAsignado!);
    if (!assignedList.includes(confirmedNumber)) {
      assignedList.push(confirmedNumber);
    }

    const updatedState = await db.updateState({
      participanteActualId: null,
      numeroPropuesto: null,
      numerosDisponibles: availableLeft,
      numerosAsignados: assignedList,
      descartadosEnEsteIntento: [], // reset discards for next person
      estado: "LISTO"
    });

    await db.addLog({
      accion: "NUMERO_CONFIRMADO",
      detalles: `Asignación confirmada: Número ${confirmedNumber} asignado a ${updatedParticipant.nombre} ${updatedParticipant.apellido}`,
      usuario: req.user.username,
      ip: req.ip || "127.0.0.1"
    });

    await broadcastParticipants();
    await broadcastState();
    
    // Broadcast live confetti and celebration
    io.emit("event:confirmed", {
      participant: updatedParticipant,
      number: confirmedNumber,
      state: updatedState
    });

    res.json({ participant: updatedParticipant, state: updatedState });
  });

  // Update Raffle Config (Range, 00, etc)
  app.post("/api/event/config", authenticateToken, async (req: any, res: any) => {
    console.log("RECEIVED CONFIG UPDATE:", req.body);
    const { rangoMin, rangoMax, habilitar00, habilitarBalonOro, numeroGanador } = req.body;
    
    // Validate range
    const min = parseInt(rangoMin) || 1;
    const max = parseInt(rangoMax) || 99;
    
    // Recalculate available numbers based on new range
    const newPool: string[] = [];
    if (habilitar00) newPool.push("00");
    for (let i = min; i <= max; i++) {
      newPool.push(String(i).padStart(2, "0"));
    }

    const currentState = await db.getState();
    const isRangeChanged = 
      currentState.config?.rangoMin !== min || 
      currentState.config?.rangoMax !== max || 
      currentState.config?.habilitar00 !== !!habilitar00;

    let formattedGanador = null;
    if (habilitarBalonOro && numeroGanador) {
      if (numeroGanador === "00" && habilitar00) {
        formattedGanador = "00";
      } else {
        const numGanador = parseInt(numeroGanador);
        if (!isNaN(numGanador)) {
          formattedGanador = String(numGanador).padStart(2, "0");
        }
      }
    }

    const updatedState = await db.updateState({
      config: {
        rangoMin: min,
        rangoMax: max,
        habilitar00: !!habilitar00,
        modoShow: false,
        showCountdown: 0,
        habilitarBalonOro: !!habilitarBalonOro,
        numeroGanador: formattedGanador
      }
    });

    if (isRangeChanged) {
      // El tablero se limpia automáticamente al cambiar el rango
      // db.resetAll() uses the updated config to regenerate the clean pool of numbers
      await db.resetAll();

      await db.addLog({
        accion: "CONFIG_CHANGE",
        detalles: `Configuración actualizada y tablero reiniciado: Rango ${min}-${max}, 00: ${habilitar00 ? 'SÍ' : 'NO'}, Balón Oro: ${habilitarBalonOro ? 'SÍ' : 'NO'} (${numeroGanador || 'NINGUNO'})`,
        usuario: req.user.username,
        ip: req.ip || "127.0.0.1"
      });
    } else {
      await db.addLog({
        accion: "CONFIG_CHANGE",
        detalles: `Configuración actualizada sin reiniciar tablero. Balón Oro: ${habilitarBalonOro ? 'SÍ' : 'NO'} (${numeroGanador || 'NINGUNO'})`,
        usuario: req.user.username,
        ip: req.ip || "127.0.0.1"
      });
    }

    await broadcastParticipants();
    await broadcastState();
    res.json(await db.getState());
  });

  // Mode: Auto Assignment ( Fisher-Yates assigns all active participants immediately )
  app.post("/api/event/auto-assign", authenticateToken, async (req: any, res: any) => {
    try {
      const { withShow } = req.body;
      const state = await db.getState();
      const participants = await db.getParticipants();

      // Find active participants without numbers assigned
      const activeUnassigned = participants.filter(p => p.participa && !p.numeroAsignado);
      if (activeUnassigned.length === 0) {
        return res.status(400).json({ error: "No unassigned active participants found" });
      }

      // Check remaining physical numbers
      const availableNumbers = [...state.numerosDisponibles];
      if (availableNumbers.length < activeUnassigned.length) {
        return res.status(400).json({ error: "Not enough physical numbers to distribute automatically" });
      }

      if (withShow) {
        let countdown = 3;
        const config = { ...(state.config || { rangoMin: 1, rangoMax: 99, habilitar00: true, modoShow: false, showCountdown: 0 }) };
        
        const runCountdown = async () => {
          if (countdown > 0) {
            await db.updateState({
              config: { ...config, modoShow: true, showCountdown: countdown }
            });
            await broadcastState();
            io.emit("event:show-countdown", { countdown });
            countdown--;
            setTimeout(runCountdown, 1000);
          } else {
            // Start shuffling phase
            await db.updateState({
              config: { ...config, modoShow: true, showCountdown: 0 } // 0 means shuffling
            });
            await broadcastState();
            io.emit("event:shuffling-start", { duration: 3000 });
            
            setTimeout(async () => {
              // Finalize assignment
              const shuffledNumbers = shuffleArray(availableNumbers);
              const updatedParticipantsList = [...participants];
              const newlyAssignedList: string[] = [];

              for (let i = 0; i < activeUnassigned.length; i++) {
                const p = activeUnassigned[i];
                const num = shuffledNumbers[i];
                p.numeroAsignado = num;
                p.fechaAsignacion = new Date().toISOString();
                newlyAssignedList.push(num);
              }

              await db.saveParticipantsBulk(updatedParticipantsList);
              const nextAvailable = availableNumbers.filter(n => !newlyAssignedList.includes(n));
              const totalAssigned = [...state.numerosAsignados, ...newlyAssignedList];

              await db.updateState({
                estado: "FINALIZADO",
                numerosDisponibles: nextAvailable,
                numerosAsignados: totalAssigned,
                config: { ...config, modoShow: false, showCountdown: 0 }
              });

              await broadcastParticipants();
              await broadcastState();
              io.emit("event:auto-assigned-complete", { count: activeUnassigned.length });
            }, 3000);
          }
        };

        runCountdown();
        return res.json({ success: true, message: "Countdown started" });
      }

      // Default behavior: Immediate assignment
      const shuffledNumbers = shuffleArray(availableNumbers);
      const updatedParticipantsList = [...participants];
      const newlyAssignedList: string[] = [];

      for (let i = 0; i < activeUnassigned.length; i++) {
        const p = activeUnassigned[i];
        const num = shuffledNumbers[i];
        p.numeroAsignado = num;
        p.fechaAsignacion = new Date().toISOString();
        newlyAssignedList.push(num);
      }

      // Save to database
      await db.saveParticipantsBulk(updatedParticipantsList);

      // Update state
      const nextAvailable = availableNumbers.filter(n => !newlyAssignedList.includes(n));
      const totalAssigned = [...state.numerosAsignados, ...newlyAssignedList];

      const updatedState = await db.updateState({
        estado: "FINALIZADO",
        participanteActualId: null,
        numeroPropuesto: null,
        numerosDisponibles: nextAvailable,
        numerosAsignados: totalAssigned,
        descartadosEnEsteIntento: []
      });

      await db.addLog({
        accion: "ASIGNACION_AUTOMATICA",
        detalles: `Asignación automática masiva`,
        usuario: req.user.username,
        ip: req.ip || "127.0.0.1"
      });

      await broadcastParticipants();
      await broadcastState();
      
      io.emit("event:auto-assigned-complete", {
        count: activeUnassigned.length,
        state: updatedState
      });

      res.json({ success: true, count: activeUnassigned.length, state: updatedState });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: "Auto assignment failed: " + e.message });
    }
  });

  // Reset entire assignment progress
  app.post("/api/event/reset", authenticateToken, async (req: any, res: any) => {
    await db.resetAll();

    await db.addLog({
      accion: "REINICIO",
      detalles: "El administrador reinició por completo todo el evento y liberó todos los números",
      usuario: req.user.username,
      ip: req.ip || "127.0.0.1"
    });

    await broadcastParticipants();
    await broadcastState();
    
    io.emit("event:reset-complete");

    res.json({ success: true });
  });

  // Get audit logs
  app.get("/api/logs", async (req, res) => {
    const logs = await db.getLogs();
    res.json(logs);
  });

  // Export spreadsheet using ExcelJS
  app.get("/api/export/excel", async (req, res) => {
    try {
      const participants = await db.getParticipants();
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Asignaciones");

      sheet.columns = [
        { header: "Nombre", key: "nombre", width: 25 },
        { header: "Apellido", key: "apellido", width: 25 },
        { header: "Equipo", key: "equipo", width: 20 },
        { header: "Área", key: "area", width: 20 },
        { header: "Pago", key: "pago", width: 12 },
        { header: "Participa", key: "participa", width: 12 },
        { header: "Número Asignado", key: "numero", width: 18 },
        { header: "Medio de Pago", key: "medio", width: 18 },
        { header: "Valor", key: "valor", width: 12 },
        { header: "Fecha Asignación", key: "fecha", width: 25 }
      ];

      // Style header row
      sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFF" } };
      sheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "0B1528" }
      };

      participants.forEach((p: any) => {
        sheet.addRow({
          nombre: p.nombre,
          apellido: p.apellido,
          equipo: p.equipo || "",
          area: p.area || "",
          pago: p.pago ? "SÍ" : "NO",
          participa: p.participa ? "SÍ" : "NO",
          numero: p.numeroAsignado || "NO ASIGNADO",
          medio: p.medioPago || "",
          valor: p.valor || 0,
          fecha: p.fechaAsignacion ? new Date(p.fechaAsignacion).toLocaleString("es-ES") : ""
        });
      });

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=" + encodeURIComponent("Asignacion_Numeros_SorteoSOS.xlsx")
      );

      await workbook.xlsx.write(res);
      res.end();
    } catch (e: any) {
      res.status(500).send("Export failed: " + e.message);
    }
  });

  // Export raw CSV
  app.get("/api/export/csv", async (req, res) => {
    try {
      const participants = await db.getParticipants();
      let csv = "Nombre,Apellido,Equipo,Area,Pago,Participa,NumeroAsignado,MedioPago,Valor,FechaAsignacion\n";

      participants.forEach((p: any) => {
        csv += `"${p.nombre}","${p.apellido}","${p.equipo || ""}","${p.area || ""}","${p.pago ? "SI" : "NO"}","${p.participa ? "SI" : "NO"}","${p.numeroAsignado || ""}","${p.medioPago || ""}",${p.valor || 0},"${p.fechaAsignacion || ""}"\n`;
      });

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=SorteoSOS_Asignaciones.csv");
      res.send(csv);
    } catch (e: any) {
      res.status(500).send("Export CSV failed: " + e.message);
    }
  });

  // Clear Audit Logs
  app.post("/api/logs/clear", authenticateToken, async (req: any, res: any) => {
    await db.clearLogs();
    await db.addLog({
      accion: "LIMPIEZA_LOGS",
      detalles: "El administrador limpió el historial de auditoría",
      usuario: req.user.username,
      ip: req.ip || "127.0.0.1"
    });
    res.json({ success: true });
  });

  // --- WebSocket Connection ---
  io.on("connection", (socket) => {
    console.log("Client connected to SorteoSOS WebSockets");

    socket.on("get:state", async () => {
      const state = await db.getState();
      const config = await db.getConfig();
      const participants = await db.getParticipants();
      socket.emit("state:changed", { state, config, participantsCount: participants.length });
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected");
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  if (!process.env.VERCEL) {
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }

  return { app, server };
}

export const appPromise = startServer();
