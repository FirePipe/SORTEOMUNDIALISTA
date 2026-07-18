import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import crypto from "crypto";

// Check if we can connect to MongoDB
const DEFAULT_MONGO_URI = "mongodb+srv://pipeblox_db_user:vWxgn7jStYq2xzQH@cluster0.1rnexaj.mongodb.net/";
let MONGODB_URI = process.env.MONGODB_URI || DEFAULT_MONGO_URI;

// Handle potential duplicate pattern typos in connection strings gracefully
if (MONGODB_URI.includes("@cluster0.1rnexaj@cluster0.1rnexaj.mongodb.net")) {
  MONGODB_URI = MONGODB_URI.replace("@cluster0.1rnexaj@cluster0.1rnexaj.mongodb.net", "@cluster0.1rnexaj.mongodb.net");
}

let useLocalFile = true;

const isVercel = !!(process.env.VERCEL || process.env.NOW_REGION || process.env.LAMBDA_TASK_ROOT);
const LOCAL_DB_DIR = isVercel ? "/tmp" : path.join(process.cwd(), "data");
const LOCAL_DB_PATH = path.join(LOCAL_DB_DIR, "sorteo_db.json");

// Ensure data folder exists (only if not on Vercel or if we really need it)
if (!isVercel && !fs.existsSync(LOCAL_DB_DIR)) {
  try {
    fs.mkdirSync(LOCAL_DB_DIR, { recursive: true });
  } catch (err) {
    console.error("Failed to create data directory:", err);
  }
}

// Interfaces for our database
interface IParticipant {
  nombre: string;
  apellido: string;
  equipo: string;
  area: string;
  pago: boolean;
  participa: boolean;
  numeroAsignado: string | null;
  fechaAsignacion?: string;
  medioPago?: string;
  valor?: number;
}

const SEED_PARTICIPANTS: IParticipant[] = [
  { nombre: "CARLOS ANDRES", apellido: "VELASQUEZ", equipo: "GESTION DE INGRESOS", area: "JEFATURA", pago: true, participa: true, numeroAsignado: null, medioPago: "llave", valor: 20000 },
  { nombre: "GERMAN", apellido: "CASTILLLO", equipo: "GESTION DE INGRESOS", area: "JEFATURA", pago: true, participa: true, numeroAsignado: null, medioPago: "llave", valor: 20000 },
  { nombre: "ELIZABETH", apellido: "TAMAYO CASTRO", equipo: "GESTION DE INGRESOS", area: "COORDINACION", pago: true, participa: true, numeroAsignado: null, medioPago: "llave", valor: 20000 },
  { nombre: "MARILYN", apellido: "DIAZ DIAZ", equipo: "GESTION DE INGRESOS", area: "REGISTRO", pago: true, participa: true, numeroAsignado: null, medioPago: "llave", valor: 20000 },
  { nombre: "ERIC FABIAN", apellido: "AMAYA NAGLES", equipo: "GESTION DE INGRESOS", area: "REGISTRO", pago: true, participa: true, numeroAsignado: null, medioPago: "llave", valor: 20000 },
  { nombre: "ANYI", apellido: "TATIANA", equipo: "GESTION DE INGRESOS", area: "REGISTRO", pago: true, participa: true, numeroAsignado: null, medioPago: "llave", valor: 20000 },
  { nombre: "KAREN TATIANA", apellido: "PEREA MOSQUERA", equipo: "GESTION DE INGRESOS", area: "REGISTRO", pago: true, participa: true, numeroAsignado: null, medioPago: "llave", valor: 20000 },
  { nombre: "DANIELA", apellido: "VARELA TROCHEZ", equipo: "GESTION DE INGRESOS", area: "REGISTRO", pago: true, participa: true, numeroAsignado: null, medioPago: "llave", valor: 20000 },
  { nombre: "ELIANA", apellido: "HERRERA OSPINA", equipo: "GESTION DE INGRESOS", area: "REGISTRO", pago: true, participa: true, numeroAsignado: null, medioPago: "llave", valor: 20000 },
  { nombre: "JESSICA ANDREA", apellido: "HERNANDEZ MOLINA", equipo: "GESTION DE INGRESOS", area: "REGISTRO", pago: true, participa: true, numeroAsignado: null, medioPago: "llave", valor: 20000 },
  { nombre: "MAURICIO", apellido: "ALEXANDER", equipo: "GESTION DE INGRESOS", area: "REGISTRO", pago: true, participa: true, numeroAsignado: null, medioPago: "llave", valor: 20000 },
  { nombre: "SANDRA MILENA", apellido: "VELEZ ESQUIVEL", equipo: "GESTION DE INGRESOS", area: "REGISTRO", pago: true, participa: true, numeroAsignado: null, medioPago: "llave", valor: 20000 },
  { nombre: "ANDRES FELIPE", apellido: "IBARGUEN MOSQUERA", equipo: "GESTION DE INGRESOS", area: "REGISTRO", pago: true, participa: true, numeroAsignado: null, medioPago: "llave", valor: 20000 },
  { nombre: "JHONATAN ALEXIS", apellido: "BURGOS VELASQUEZ", equipo: "GESTION DE INGRESOS", area: "REGISTRO", pago: true, participa: true, numeroAsignado: null, medioPago: "llave", valor: 20000 },
  { nombre: "JOHN ALEXANDER", apellido: "CASTRO MENESES", equipo: "GESTION DE INGRESOS", area: "REGISTRO", pago: true, participa: true, numeroAsignado: null, medioPago: "llave", valor: 20000 },
  { nombre: "DENNISE CATALINA", apellido: "TORRES CANO", equipo: "GESTION DE INGRESOS", area: "REGISTRO", pago: true, participa: true, numeroAsignado: null, medioPago: "llave", valor: 20000 },
  { nombre: "DANNA JULIETH", apellido: "CRUZ", equipo: "GESTION DE INGRESOS", area: "REGISTRO", pago: true, participa: true, numeroAsignado: null, medioPago: "llave", valor: 20000 },
  { nombre: "ANDRES FELIPE", apellido: "TORRES RAMIREZ", equipo: "GESTION DE INGRESOS", area: "APORTES", pago: true, participa: true, numeroAsignado: null, medioPago: "llave", valor: 20000 },
  { nombre: "CRISTHIAN FELIPE", apellido: "HERRERA CORTES", equipo: "GESTION DE INGRESOS", area: "APORTES", pago: true, participa: true, numeroAsignado: null, medioPago: "llave", valor: 20000 },
  { nombre: "FERNANDO YOVANNI", apellido: "ALDANA HERNANDEZ", equipo: "GESTION DE INGRESOS", area: "APORTES", pago: true, participa: true, numeroAsignado: null, medioPago: "llave", valor: 20000 },
  { nombre: "HAROLD GARCIA", apellido: "BAHOZ", equipo: "GESTION DE INGRESOS", area: "APORTES", pago: true, participa: true, numeroAsignado: null, medioPago: "llave", valor: 20000 },
  { nombre: "JORGE ALBERTO", apellido: "TORRES BENITEZ", equipo: "GESTION DE INGRESOS", area: "APORTES", pago: true, participa: true, numeroAsignado: null, medioPago: "llave", valor: 20000 },
  { nombre: "KEVIN DAVID", apellido: "URBANO ASTUDILLO", equipo: "GESTION DE INGRESOS", area: "APORTES", pago: true, participa: true, numeroAsignado: null, medioPago: "llave", valor: 20000 },
  { nombre: "RUTH HIBONNI", apellido: "GÜECHE REYES", equipo: "GESTION DE INGRESOS", area: "APORTES", pago: true, participa: true, numeroAsignado: null, medioPago: "llave", valor: 20000 },
  { nombre: "YENI MARTINEZ", apellido: "BARAHONA", equipo: "GESTION DE INGRESOS", area: "APORTES", pago: true, participa: true, numeroAsignado: null, medioPago: "llave", valor: 20000 },
  { nombre: "YENNIFER PAMELA", apellido: "LUNA MONCAYO", equipo: "GESTION DE INGRESOS", area: "APORTES", pago: true, participa: true, numeroAsignado: null, medioPago: "llave", valor: 20000 },
  { nombre: "YULY ANDREA", apellido: "HOYOS CAICEDO", equipo: "GESTION DE INGRESOS", area: "APORTES", pago: true, participa: true, numeroAsignado: null, medioPago: "llave", valor: 20000 },
  { nombre: "YESICA MARCELA", apellido: "SOTO HENAO", equipo: "GESTION DE INGRESOS", area: "APORTES", pago: true, participa: true, numeroAsignado: null, medioPago: "llave", valor: 20000 },
  { nombre: "JOHANNA ANDREA", apellido: "RAMIREZ OIME", equipo: "GESTION DE INGRESOS", area: "APORTES", pago: true, participa: true, numeroAsignado: null, medioPago: "llave", valor: 20000 },
  { nombre: "MARTHA JIMENA", apellido: "NOY HOMEN", equipo: "GESTION DE INGRESOS", area: "APORTES", pago: true, participa: true, numeroAsignado: null, medioPago: "llave", valor: 20000 },
  { nombre: "DIEGO ANDRES", apellido: "OTERO SALAZAR", equipo: "GESTION DE INGRESOS", area: "CARTERA PBS/PAC", pago: true, participa: true, numeroAsignado: null, medioPago: "llave", valor: 20000 },
  { nombre: "MILLER", apellido: "PINTO", equipo: "GESTION DE INGRESOS", area: "CARTERA PBS/PAC", pago: true, participa: true, numeroAsignado: null, medioPago: "llave", valor: 20000 },
  { nombre: "IVONE", apellido: "CUERVO ERAZO", equipo: "GESTION DE INGRESOS", area: "CARTERA PBS/PAC", pago: true, participa: true, numeroAsignado: null, medioPago: "llave", valor: 20000 },
  { nombre: "YERELY TATIANA", apellido: "HENAO FAJARDO", equipo: "GESTION DE INGRESOS", area: "CARTERA PBS/PAC", pago: true, participa: true, numeroAsignado: null, medioPago: "llave", valor: 20000 },
  { nombre: "DIANA MARCEL", apellido: "IGUA BRAVO", equipo: "GESTION DE INGRESOS", area: "CARTERA PBS/PAC", pago: true, participa: true, numeroAsignado: null, medioPago: "llave", valor: 20000 },
  { nombre: "KELLY STEPHANY", apellido: "RINCON GOMEZ", equipo: "GESTION DE INGRESOS", area: "CARTERA PBS/PAC", pago: true, participa: true, numeroAsignado: null, medioPago: "llave", valor: 20000 },
  { nombre: "OLGA LUCIA", apellido: "LOPEZ SANCHEZ", equipo: "GESTION DE INGRESOS", area: "CARTERA PBS/PAC", pago: true, participa: true, numeroAsignado: null, medioPago: "llave", valor: 20000 },
  { nombre: "BELKIS PAOLA", apellido: "VELASQUEZ BERMUDEZ", equipo: "GESTION DE INGRESOS", area: "CARTERA PBS/PAC", pago: true, participa: true, numeroAsignado: null, medioPago: "llave", valor: 20000 },
  { nombre: "JUAN JOSÉ", apellido: "KRAFT CEBALLOS", equipo: "GESTION DE INGRESOS", area: "CARTERA NO PBS", pago: true, participa: true, numeroAsignado: null, medioPago: "llave", valor: 20000 },
  { nombre: "PAOLA ANDREA", apellido: "PALMA PEÑA", equipo: "GESTION DE INGRESOS", area: "CARTERA ARL", pago: true, participa: true, numeroAsignado: null, medioPago: "llave", valor: 20000 },
  { nombre: "GERMAN", apellido: "ARBOLEDA", equipo: "GESTION DE INGRESOS", area: "RECOBROS Y CARTERA", pago: true, participa: true, numeroAsignado: null, medioPago: "llave", valor: 20000 },
  { nombre: "YULY ANDREA", apellido: "MEDINA MORANTES", equipo: "GESTION DE INGRESOS", area: "RECOBROS Y CARTERA", pago: true, participa: true, numeroAsignado: null, medioPago: "llave", valor: 20000 },
  { nombre: "YINA", apellido: "MOSQUERA", equipo: "GESTION DE INGRESOS", area: "CARTERA PBS/PAC Y NO PBS", pago: true, participa: true, numeroAsignado: null, medioPago: "llave", valor: 20000 },
  { nombre: "MARCELA", apellido: "RINCON", equipo: "GESTION DE INGRESOS", area: "CARTERA PBS/PAC Y NO PBS", pago: true, participa: true, numeroAsignado: null, medioPago: "llave", valor: 20000 },
  { nombre: "LUZ KARIME", apellido: "VILLA", equipo: "GESTION DE INGRESOS", area: "CARTERA PBS/PAC Y NO PBS", pago: true, participa: true, numeroAsignado: null, medioPago: "llave", valor: 20000 },
  { nombre: "ANGELA", apellido: "RIVERA", equipo: "GESTION DE INGRESOS", area: "CARTERA PBS/PAC Y NO PBS", pago: true, participa: true, numeroAsignado: null, medioPago: "llave", valor: 20000 },
  { nombre: "NATALIA", apellido: "GORDILLO", equipo: "GESTION DE INGRESOS", area: "CARTERA PBS/PAC Y NO PBS", pago: true, participa: true, numeroAsignado: null, medioPago: "llave", valor: 20000 },
  { nombre: "MARIA FERNANDA", apellido: "OSMA", equipo: "GESTION DE INGRESOS", area: "CARTERA PBS/PAC Y NO PBS", pago: true, participa: true, numeroAsignado: null, medioPago: "llave", valor: 20000 },
  { nombre: "ANYELA", apellido: "GARCIA", equipo: "GESTION DE INGRESOS", area: "REGISTRO", pago: true, participa: true, numeroAsignado: null, medioPago: "llave", valor: 20000 },
  { nombre: "MONICA", apellido: "REYES", equipo: "GESTION DE INGRESOS", area: "DIRECTOR", pago: true, participa: true, numeroAsignado: null, medioPago: "llave", valor: 20000 },
  { nombre: "ANDERSON", apellido: "TILMANS", equipo: "GESTION DE INGRESOS", area: "CARTERA", pago: true, participa: true, numeroAsignado: null, medioPago: "llave", valor: 20000 },
  { nombre: "JULIETH", apellido: "MERCHANCA", equipo: "GESTION DE INGRESOS", area: "REGISTRO", pago: true, participa: true, numeroAsignado: null, medioPago: "llave", valor: 20000 }
];

interface ILog {
  accion: string;
  detalles: string;
  usuario: string;
  fecha: string;
  ip?: string;
}

interface IRaffleConfig {
  rangoMin: number;
  rangoMax: number;
  habilitar00: boolean;
  modoShow: boolean;
  showCountdown: number;
  habilitarBalonOro?: boolean;
  numeroGanador?: string | null;
}

interface IState {
  estado: "LISTO" | "EJECUTANDO" | "PAUSADO" | "FINALIZADO";
  participanteActualId: string | null;
  numeroPropuesto: string | null;
  numerosDisponibles: string[];
  numerosAsignados: string[];
  descartadosEnEsteIntento: string[];
  config?: IRaffleConfig;
}

interface IConfig {
  soundEnabled: boolean;
  tempoFlashing: number;
  tiempoAnimacion: number;
  nombreEvento: string;
}

// Local File Store Class for fallback with In-Memory Caching
class LocalStore {
  private data: {
    usuarios: any[];
    participantes: any[];
    logs: any[];
    state: IState;
    config: IConfig;
  };
  private isDirty: boolean = false;

  constructor() {
    this.data = {
      usuarios: [
        {
          _id: "admin-id-1",
          username: "admin@sos.com.co",
          passwordHash: crypto.createHash("sha256").update("FiebreMundial2026").digest("hex"),
        },
        {
          _id: "admin-id-2",
          username: "mundialsorteo@sos.com.co",
          passwordHash: crypto.createHash("sha256").update("FiebreMundial2026").digest("hex"),
        }
      ],
      participantes: SEED_PARTICIPANTS.map((p, i) => ({ _id: `p-init-${i + 1}`, ...p })),
      logs: [],
      state: {
        estado: "LISTO",
        participanteActualId: null,
        numeroPropuesto: null,
        numerosDisponibles: Array.from({ length: 999 }, (_, i) => String(i + 1).padStart(2, "0")),
        numerosAsignados: [],
        descartadosEnEsteIntento: [],
        config: {
          rangoMin: 1,
          rangoMax: 999,
          habilitar00: false,
          modoShow: false,
          showCountdown: 0
        }
      },
      config: {
        soundEnabled: true,
        tempoFlashing: 60,
        tiempoAnimacion: 6000,
        nombreEvento: "Sorteo Oficial de Números SorteoSOS"
      }
    };
    this.load();
    
    // Periodically save if dirty to reduce write frequency during fast animations
    setInterval(() => {
      if (this.isDirty) {
        this.save();
      }
    }, 2000);
  }

  private load() {
    if (fs.existsSync(LOCAL_DB_PATH)) {
      try {
        const fileContent = fs.readFileSync(LOCAL_DB_PATH, "utf-8");
        const parsed = JSON.parse(fileContent);
        this.data = { ...this.data, ...parsed };
        if (!this.data.participantes || this.data.participantes.length === 0) {
          this.data.participantes = SEED_PARTICIPANTS.map((p, i) => ({ _id: `p-init-${i + 1}`, ...p }));
          this.isDirty = true;
        }
      } catch (e) {
        console.error("Error reading local DB file, using defaults", e);
      }
    } else {
      this.isDirty = true;
    }
  }

  private save() {
    try {
      fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(this.data, null, 2), "utf-8");
      this.isDirty = false;
    } catch (e) {
      console.error("Error writing local DB file", e);
    }
  }

  getUsers() { return this.data.usuarios; }
  addUser(user: any) {
    const newUser = { _id: Date.now().toString(), ...user };
    this.data.usuarios.push(newUser);
    this.isDirty = true;
    return newUser;
  }

  getParticipants() { return this.data.participantes; }
  setParticipants(list: any[]) {
    this.data.participantes = list;
    this.isDirty = true;
  }
  updateParticipant(id: string, update: any) {
    const idx = this.data.participantes.findIndex(p => p._id === id || p.id === id);
    if (idx !== -1) {
      this.data.participantes[idx] = { ...this.data.participantes[idx], ...update };
      this.isDirty = true;
      return this.data.participantes[idx];
    }
    return null;
  }
  addParticipant(p: any) {
    const newP = { _id: "p-" + Date.now() + "-" + Math.random().toString(36).substr(2, 4), ...p };
    this.data.participantes.push(newP);
    this.isDirty = true;
    return newP;
  }
  deleteParticipant(id: string) {
    this.data.participantes = this.data.participantes.filter(p => p._id !== id && p.id !== id);
    this.isDirty = true;
  }

  getLogs() { return this.data.logs; }
  addLog(log: any) {
    const newLog = { _id: "log-" + Date.now(), fecha: new Date().toISOString(), ...log };
    this.data.logs.unshift(newLog); // newest first
    this.isDirty = true;
    return newLog;
  }
  clearLogs() {
    this.data.logs = [];
    this.isDirty = true;
  }

  getState() { return this.data.state; }
  updateState(update: Partial<IState>) {
    this.data.state = { ...this.data.state, ...update };
    this.isDirty = true;
    return this.data.state;
  }

  getConfig() { return this.data.config; }
  updateConfig(update: Partial<IConfig>) {
    this.data.config = { ...this.data.config, ...update };
    this.isDirty = true;
    return this.data.config;
  }

  resetAll() {
    this.data.participantes = this.data.participantes.map(p => ({
      ...p,
      numeroAsignado: null,
      fechaAsignacion: undefined
    }));
    
    const min = this.data.state.config?.rangoMin || 1;
    const max = this.data.state.config?.rangoMax || 999;
    const habilitar00 = this.data.state.config?.habilitar00 || false;
    
    const newPool: string[] = [];
    if (habilitar00) newPool.push("00");
    for (let i = min; i <= max; i++) {
      newPool.push(String(i).padStart(2, "0"));
    }

    this.data.state = {
      ...this.data.state,
      estado: "LISTO",
      participanteActualId: null,
      numeroPropuesto: null,
      numerosDisponibles: newPool,
      numerosAsignados: [],
      descartadosEnEsteIntento: []
    };
    this.isDirty = true;
  }
}

const localStore = new LocalStore();
let lastError: string | null = null;

let connectionPromise: Promise<void> | null = null;

async function ensureConnected() {
  if (connectionPromise) {
    try {
      await connectionPromise;
    } catch (err) {
      // Ignore errors here to allow useLocalFile fallback to work gracefully
    }
  }
}

// Mongoose Schemas (Matching MongoDB collections)
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true }
}, { collection: "usuarios" });

// Target existing "participantes_no_relacional" collection for participants
const ParticipantSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  apellido: { type: String, required: true },
  equipo: { type: String },
  area: { type: String },
  pago: { type: Boolean, default: false },
  participa: { type: Boolean, default: true },
  numeroAsignado: { type: String, default: null },
  fechaAsignacion: { type: String },
  medioPago: { type: String },
  valor: { type: Number }
}, { collection: "participantes_no_relacional" });

const LogSchema = new mongoose.Schema({
  accion: { type: String, required: true },
  detalles: { type: String, required: true },
  usuario: { type: String, required: true },
  fecha: { type: String, required: true },
  ip: { type: String }
}, { collection: "historial" });

const StateSchema = new mongoose.Schema({
  estado: { type: String, default: "LISTO" },
  participanteActualId: { type: String, default: null },
  numeroPropuesto: { type: String, default: null },
  numerosDisponibles: { type: [String], default: [] },
  numerosAsignados: { type: [String], default: [] },
  descartadosEnEsteIntento: { type: [String], default: [] },
  config: {
    rangoMin: { type: Number, default: 1 },
    rangoMax: { type: Number, default: 999 },
    habilitar00: { type: Boolean, default: false },
    modoShow: { type: Boolean, default: false },
    showCountdown: { type: Number, default: 0 },
    habilitarBalonOro: { type: Boolean, default: false },
    numeroGanador: { type: String, default: null }
  }
}, { collection: "eventos" });

const ConfigSchema = new mongoose.Schema({
  soundEnabled: { type: Boolean, default: true },
  tempoFlashing: { type: Number, default: 60 },
  tiempoAnimacion: { type: Number, default: 6000 },
  nombreEvento: { type: String, default: "Sorteo Oficial de Números SorteoSOS" }
}, { collection: "configuracion" });

const UserModel = mongoose.model("usuarios", UserSchema);
const ParticipantModel = mongoose.model("participantes", ParticipantSchema);
const LogModel = mongoose.model("historial", LogSchema);
const StateModel = mongoose.model("eventos", StateSchema);
const ConfigModel = mongoose.model("configuracion", ConfigSchema);

// Initial setup helper for Mongo
async function seedMongo() {
  if (useLocalFile) return;
  try {
    // Ensure both specific admins are seeded in MongoDB and legacy one is cleaned
    await UserModel.deleteMany({ username: { $in: ["admin", "admin@sos.com.co", "mundialsorteo@sos.com.co"] } });
    await UserModel.create([
      {
        username: "admin@sos.com.co",
        passwordHash: crypto.createHash("sha256").update("FiebreMundial2026").digest("hex")
      },
      {
        username: "mundialsorteo@sos.com.co",
        passwordHash: crypto.createHash("sha256").update("FiebreMundial2026").digest("hex")
      }
    ]);
    console.log("Admin accounts successfully seeded to MongoDB");
    const configCount = await ConfigModel.countDocuments();
    if (configCount === 0) {
      await ConfigModel.create({
        soundEnabled: true,
        tempoFlashing: 60,
        tiempoAnimacion: 6000,
        nombreEvento: "Sorteo Oficial de Números SorteoSOS"
      });
    }
    const stateCount = await StateModel.countDocuments();
    if (stateCount === 0) {
      await StateModel.create({
        estado: "LISTO",
        participanteActualId: null,
        numeroPropuesto: null,
        numerosDisponibles: Array.from({ length: 999 }, (_, i) => String(i + 1).padStart(2, "0")),
        numerosAsignados: [],
        descartadosEnEsteIntento: [],
        config: {
          rangoMin: 1,
          rangoMax: 999,
          habilitar00: false,
          modoShow: false,
          showCountdown: 0
        }
      });
    }
    const participantCount = await ParticipantModel.countDocuments();
    if (participantCount === 0) {
      await ParticipantModel.insertMany(SEED_PARTICIPANTS);
      console.log("Seeded 52 participants into MongoDB");
    }
  } catch (e) {
    console.error("Error seeding MongoDB:", e);
  }
}

// Try to initialize MongoDB connection if requested with fast fail-safe timeouts (2.5 seconds)
if (MONGODB_URI) {
  connectionPromise = mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 2500, // Timeout for finding/selecting the cluster
    connectTimeoutMS: 2500          // Timeout for the initial socket connection
  })
    .then(async () => {
      console.log("Successfully connected to MongoDB at SorteoSOS");
      useLocalFile = false;
      await seedMongo();
    })
    .catch((err) => {
      console.warn("MongoDB connection failed. Falling back to local file storage.", err);
      useLocalFile = true;
      lastError = err.message || String(err);
    });
} else {
  console.log("No MONGODB_URI environment variable detected. Using local file storage.");
  useLocalFile = true;
}

// Simple In-Memory Cache for high-frequency reads (socket broadcasts)
let cacheParticipants: any[] | null = null;
let cacheState: any | null = null;
let cacheConfig: any | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 1500; // 1.5 seconds

// Exported DB interface
export const db = {
  isLocal: () => useLocalFile,

  async getUsers() {
    await ensureConnected();
    if (useLocalFile) return localStore.getUsers();
    return await UserModel.find({});
  },

  async findUser(username: string) {
    await ensureConnected();
    if (useLocalFile) return localStore.getUsers().find(u => u.username === username);
    return await UserModel.findOne({ username });
  },

  async createUser(user: any) {
    await ensureConnected();
    if (useLocalFile) return localStore.addUser(user);
    return await UserModel.create(user);
  },

  async getParticipants() {
    await ensureConnected();
    if (useLocalFile) return localStore.getParticipants();
    
    return await ParticipantModel.find({});
  },

  async addParticipant(p: any) {
    await ensureConnected();
    cacheParticipants = null; // Invalidate
    if (useLocalFile) return localStore.addParticipant(p);
    return await ParticipantModel.create(p);
  },

  async updateParticipant(id: string, update: any) {
    await ensureConnected();
    cacheParticipants = null; // Invalidate
    if (useLocalFile) return localStore.updateParticipant(id, update);
    return await ParticipantModel.findByIdAndUpdate(id, update, { new: true });
  },

  async deleteParticipant(id: string) {
    await ensureConnected();
    cacheParticipants = null; // Invalidate
    if (useLocalFile) return localStore.deleteParticipant(id);
    return await ParticipantModel.findByIdAndDelete(id);
  },

  async saveParticipantsBulk(list: any[]) {
    await ensureConnected();
    cacheParticipants = null; // Invalidate
    if (useLocalFile) {
      localStore.setParticipants(list);
      return;
    }
    // Wipe and write for clean sync
    await ParticipantModel.deleteMany({});
    await ParticipantModel.insertMany(list);
  },

  async getLogs() {
    await ensureConnected();
    if (useLocalFile) return localStore.getLogs();
    return await LogModel.find({}).sort({ fecha: -1 });
  },

  async addLog(log: any) {
    await ensureConnected();
    if (useLocalFile) return localStore.addLog(log);
    return await LogModel.create({ ...log, fecha: new Date().toISOString() });
  },

  async clearLogs() {
    await ensureConnected();
    if (useLocalFile) return localStore.clearLogs();
    return await LogModel.deleteMany({});
  },

  async getState() {
    await ensureConnected();
    if (useLocalFile) return localStore.getState();
    
    let st = await StateModel.findOne({});
    if (!st) {
      st = await StateModel.create({
        estado: "LISTO",
        participanteActualId: null,
        numeroPropuesto: null,
        numerosDisponibles: Array.from({ length: 999 }, (_, i) => String(i + 1).padStart(2, "0")),
        numerosAsignados: [],
        descartadosEnEsteIntento: [],
        config: {
          rangoMin: 1,
          rangoMax: 999,
          habilitar00: false,
          modoShow: false,
          showCountdown: 0
        }
      });
    }
    return st;
  },

  async updateState(update: Partial<IState>) {
    await ensureConnected();
    cacheState = null; // Invalidate
    if (useLocalFile) return localStore.updateState(update);
    let st = await StateModel.findOne({});
    if (!st) {
      return await StateModel.create(update);
    }
    Object.assign(st, update);
    await st.save();
    return st;
  },

  async getConfig() {
    await ensureConnected();
    if (useLocalFile) return localStore.getConfig();

    let cfg = await ConfigModel.findOne({});
    if (!cfg) {
      cfg = await ConfigModel.create({
        soundEnabled: true,
        tempoFlashing: 60,
        tiempoAnimacion: 6000,
        nombreEvento: "Sorteo Oficial de Números SorteoSOS"
      });
    }
    return cfg;
  },

  async updateConfig(update: Partial<IConfig>) {
    await ensureConnected();
    cacheConfig = null; // Invalidate
    if (useLocalFile) return localStore.updateConfig(update);
    let cfg = await ConfigModel.findOne({});
    if (!cfg) {
      return await ConfigModel.create(update);
    }
    Object.assign(cfg, update);
    await cfg.save();
    return cfg;
  },

  async resetAll() {
    await ensureConnected();
    cacheParticipants = null;
    cacheState = null;
    if (useLocalFile) {
      localStore.resetAll();
      return;
    }
    // Update all participants assigned number to null
    await ParticipantModel.updateMany({}, { $set: { numeroAsignado: null, fechaAsignacion: null } });
    let st = await StateModel.findOne({});
    if (st) {
      const min = st.config?.rangoMin || 1;
      const max = st.config?.rangoMax || 999;
      const habilitar00 = st.config?.habilitar00 || false;
      
      const newPool: string[] = [];
      if (habilitar00) newPool.push("00");
      for (let i = min; i <= max; i++) {
        newPool.push(String(i).padStart(2, "0"));
      }

      st.estado = "LISTO";
      st.participanteActualId = null;
      st.numeroPropuesto = null;
      st.numerosDisponibles = newPool;
      st.numerosAsignados = [];
      st.descartadosEnEsteIntento = [];
      // Keep existing config
      if (st.config) {
        st.config.modoShow = false;
        st.config.showCountdown = 0;
      }
      await st.save();
    }
  },

  async getMongoStatus() {
    await ensureConnected();
    return {
      connected: !useLocalFile,
      mode: useLocalFile ? "Archivo Local JSON (sorteo_db.json)" : "MongoDB Atlas",
      uri: MONGODB_URI ? MONGODB_URI.replace(/:([^@]+)@/, ":******@") : "Ninguna",
      error: lastError
    };
  },
  ParticipantModel,
  StateModel
};

