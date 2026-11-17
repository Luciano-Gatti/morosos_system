export interface GrupoDistrito {
  distrito: string;
  seguimientoHabilitado: boolean;
  inmuebles: number;
  configId?: string;
  distritoId?: string;
}

export interface Grupo {
  id: string;
  nombre: string;
  descripcion?: string;
  activo?: boolean;
  distritos: GrupoDistrito[];
  actualizado: string;
}
