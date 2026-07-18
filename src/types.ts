export interface Participant {
  _id?: string;
  id?: string; // local fallback id
  nombre: string;
  apellido: string;
  equipo: string;
  area: string;
  pago: boolean;
  participa: boolean;
  numeroAsignado: string | null; // "01" to "99" or null
  fechaAsignacion?: string;
  medioPago?: string;
  valor?: number;
}

export interface AuditLog {
  _id?: string;
  id?: string;
  accion: string; // "INICIO", "PAUSA", "CONTINUAR", "RELANZAMIENTO", "NUMERO_DESCARTADO", "NUMERO_CONFIRMADO", "REINICIO", "IMPORTACION"
  detalles: string;
  usuario: string;
  fecha: string;
  ip?: string;
}

export interface RaffleConfig {
  rangoMin: number;
  rangoMax: number;
  habilitar00: boolean;
  modoShow: boolean; // For the "intrigue" countdown
  showCountdown: number;
  habilitarBalonOro?: boolean;
  numeroGanador?: string | null; // Current countdown value
}

export interface EventState {
  estado: "LISTO" | "EJECUTANDO" | "PAUSADO" | "FINALIZADO";
  participanteActualId: string | null;
  numeroPropuesto: string | null;
  numerosDisponibles: string[]; // array of "01" to "99"
  numerosAsignados: string[]; // array of "01" to "99"
  descartadosEnEsteIntento: string[]; // numbers discarded in the current roll
  config?: RaffleConfig;
}

export interface AppConfig {
  soundEnabled: boolean;
  tempoFlashing: number; // ms between flashing numbers
  tiempoAnimacion: number; // duration in ms
  nombreEvento: string;
}
