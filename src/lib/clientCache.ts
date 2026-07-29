// Cache global del lado del cliente para respuestas instantáneas al cambiar de pestaña
const clientStore = new Map<string, any>();

export const clientCache = {
  get: <T>(key: string): T | null => {
    return clientStore.get(key) || null;
  },
  set: (key: string, data: any) => {
    clientStore.set(key, data);
  },
  clear: (key?: string) => {
    if (key) {
      clientStore.delete(key);
    } else {
      clientStore.clear();
    }
  }
};
