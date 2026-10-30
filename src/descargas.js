import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

// Descarga de archivos protegidos y hoja de compartir del sistema.
//
// Vive fuera de src/api/ porque toca módulos nativos: la capa de API recibe
// `descargarArchivo` por parámetro y se mantiene testeable sin mocks.
//
// El archivo va al directorio de cache: es un certificado que el socio mira o
// comparte en el momento, no algo que la app tenga que conservar, y así el
// sistema lo puede limpiar cuando necesite espacio.
export async function descargarArchivo(url, headers, nombre) {
  const destino = new File(Paths.cache, nombre);
  // Si quedó uno de una descarga anterior, el download falla por destino
  // ocupado; lo borramos antes (el borrado de algo que no existe no importa).
  try { destino.delete(); } catch {}
  const archivo = await File.downloadFileAsync(url, destino, { headers });
  return archivo?.uri || null;
}

// Devuelve false si el teléfono no tiene con qué compartir (raro, pero el
// simulador de iOS sin apps es uno de esos casos).
export async function compartirArchivo(uri, { mimeType, titulo } = {}) {
  if (!(await Sharing.isAvailableAsync())) return false;
  await Sharing.shareAsync(uri, { mimeType, dialogTitle: titulo, UTI: 'com.adobe.pdf' });
  return true;
}
