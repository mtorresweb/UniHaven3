import "server-only";
import * as zlib from "node:zlib";

/**
 * Generador mínimo de archivos ZIP (formato estándar), sin dependencias.
 * Escribe cada entrada con tamaños conocidos, así que no necesita data
 * descriptors, y emite el flujo con backpressure: sólo mantiene en memoria
 * un archivo a la vez.
 */

export type ZipEntry = {
  /** Nombre que tendrá el archivo dentro del zip. */
  name: string;
  /** Devuelve el contenido del archivo. */
  load: () => Promise<Uint8Array>;
};

// zlib.crc32 es nativo y muy rápido (Node >= 22.2). Si no está disponible,
// se usa la implementación en JS de abajo.
const nativeCrc32 =
  typeof (zlib as { crc32?: unknown }).crc32 === "function"
    ? (zlib.crc32 as (data: Uint8Array) => number)
    : undefined;

// CRC-32 (polinomio 0xEDB88320), usado sólo como respaldo.
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32Js(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function crc32(data: Uint8Array): number {
  return nativeCrc32 ? nativeCrc32(data) : crc32Js(data);
}

// deflateRaw asíncrono: corre en el threadpool de libuv, así que no bloquea el
// event loop (importante en instancias de 1 vCPU o menos).
function deflateRawAsync(data: Uint8Array): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    zlib.deflateRaw(data, (error, result) =>
      error ? reject(error) : resolve(result),
    );
  });
}

function dosDateTime(date: Date) {
  const time =
    (date.getHours() << 11) |
    (date.getMinutes() << 5) |
    (date.getSeconds() >> 1);
  const day =
    ((date.getFullYear() - 1980) << 9) |
    ((date.getMonth() + 1) << 5) |
    date.getDate();
  return { time, day };
}

const SIG_LOCAL = 0x04034b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_EOCD = 0x06054b50;
const FLAG_UTF8 = 0x0800;
const METHOD_STORE = 0;
const METHOD_DEFLATE = 8;

export function createZipStream(
  entries: ZipEntry[],
  modified: Date = new Date(),
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const { time, day } = dosDateTime(modified);

  let index = 0;
  let offset = 0;
  let count = 0;
  let finalized = false;
  const centralRecords: Uint8Array[] = [];

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (index < entries.length) {
        const entry = entries[index++];
        const data = Buffer.from(await entry.load());
        const nameBytes = encoder.encode(entry.name);

        const crc = crc32(data);
        const deflated = await deflateRawAsync(data);
        const useDeflate = deflated.length < data.length;
        const payload = useDeflate ? deflated : data;
        const method = useDeflate ? METHOD_DEFLATE : METHOD_STORE;

        const local = Buffer.alloc(30);
        local.writeUInt32LE(SIG_LOCAL, 0);
        local.writeUInt16LE(20, 4); // versión necesaria
        local.writeUInt16LE(FLAG_UTF8, 6); // nombres en UTF-8
        local.writeUInt16LE(method, 8);
        local.writeUInt16LE(time, 10);
        local.writeUInt16LE(day, 12);
        local.writeUInt32LE(crc, 14);
        local.writeUInt32LE(payload.length, 18);
        local.writeUInt32LE(data.length, 22);
        local.writeUInt16LE(nameBytes.length, 26);
        local.writeUInt16LE(0, 28); // sin campo extra

        const central = Buffer.alloc(46);
        central.writeUInt32LE(SIG_CENTRAL, 0);
        central.writeUInt16LE(20, 4); // versión con la que se creó
        central.writeUInt16LE(20, 6); // versión necesaria
        central.writeUInt16LE(FLAG_UTF8, 8);
        central.writeUInt16LE(method, 10);
        central.writeUInt16LE(time, 12);
        central.writeUInt16LE(day, 14);
        central.writeUInt32LE(crc, 16);
        central.writeUInt32LE(payload.length, 20);
        central.writeUInt32LE(data.length, 24);
        central.writeUInt16LE(nameBytes.length, 28);
        central.writeUInt16LE(0, 30); // sin campo extra
        central.writeUInt16LE(0, 32); // sin comentario
        central.writeUInt16LE(0, 34); // disco
        central.writeUInt16LE(0, 36); // atributos internos
        central.writeUInt32LE(0, 38); // atributos externos
        central.writeUInt32LE(offset, 42); // offset del header local

        controller.enqueue(local);
        controller.enqueue(nameBytes);
        controller.enqueue(payload);

        centralRecords.push(central, nameBytes);
        offset += local.length + nameBytes.length + payload.length;
        count++;
        return;
      }

      if (finalized) return;
      finalized = true;

      const centralDirectory = Buffer.concat(centralRecords);

      const eocd = Buffer.alloc(22);
      eocd.writeUInt32LE(SIG_EOCD, 0);
      eocd.writeUInt16LE(0, 4); // número de disco
      eocd.writeUInt16LE(0, 6); // disco del directorio central
      eocd.writeUInt16LE(count, 8); // entradas en este disco
      eocd.writeUInt16LE(count, 10); // entradas totales
      eocd.writeUInt32LE(centralDirectory.length, 12);
      eocd.writeUInt32LE(offset, 16);
      eocd.writeUInt16LE(0, 20); // sin comentario

      controller.enqueue(centralDirectory);
      controller.enqueue(eocd);
      controller.close();
    },
  });
}
