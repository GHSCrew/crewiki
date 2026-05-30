// Minimal pure-JS ZIP builder (STORE / no compression).
// Enough to bundle a set of UTF-8 text files into a downloadable archive
// without pulling in a dependency.

export interface ZipEntry {
  /** Path inside the archive, e.g. "Team/Boats/rigging.md" */
  name: string;
  content: string;
}

const CRC_TABLE: number[] = (() => {
  const table = new Array<number>(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function createZip(entries: ZipEntry[]): Blob {
  const encoder = new TextEncoder();
  const fileParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const dataBytes = encoder.encode(entry.content);
    const crc = crc32(dataBytes);
    const size = dataBytes.length;

    // ── Local file header ───────────────────────────────────────────
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true); // signature
    local.setUint16(4, 20, true); // version needed
    local.setUint16(6, 0x0800, true); // flags: UTF-8 filename
    local.setUint16(8, 0, true); // method: store
    local.setUint16(10, 0, true); // mod time
    local.setUint16(12, 0, true); // mod date
    local.setUint32(14, crc, true);
    local.setUint32(18, size, true); // compressed size
    local.setUint32(22, size, true); // uncompressed size
    local.setUint16(26, nameBytes.length, true);
    local.setUint16(28, 0, true); // extra length

    const localHeader = new Uint8Array(local.buffer);
    fileParts.push(localHeader, nameBytes, dataBytes);

    // ── Central directory header ────────────────────────────────────
    const central = new DataView(new ArrayBuffer(46));
    central.setUint32(0, 0x02014b50, true); // signature
    central.setUint16(4, 20, true); // version made by
    central.setUint16(6, 20, true); // version needed
    central.setUint16(8, 0x0800, true); // flags
    central.setUint16(10, 0, true); // method
    central.setUint16(12, 0, true); // mod time
    central.setUint16(14, 0, true); // mod date
    central.setUint32(16, crc, true);
    central.setUint32(20, size, true);
    central.setUint32(24, size, true);
    central.setUint16(28, nameBytes.length, true);
    central.setUint16(30, 0, true); // extra length
    central.setUint16(32, 0, true); // comment length
    central.setUint16(34, 0, true); // disk number start
    central.setUint16(36, 0, true); // internal attrs
    central.setUint32(38, 0, true); // external attrs
    central.setUint32(42, offset, true); // local header offset
    centralParts.push(new Uint8Array(central.buffer), nameBytes);

    offset += localHeader.length + nameBytes.length + dataBytes.length;
  }

  const centralSize = centralParts.reduce((sum, p) => sum + p.length, 0);

  // ── End of central directory ──────────────────────────────────────
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(4, 0, true); // disk number
  end.setUint16(6, 0, true); // disk with central dir
  end.setUint16(8, entries.length, true); // entries on disk
  end.setUint16(10, entries.length, true); // total entries
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true); // central dir offset
  end.setUint16(20, 0, true); // comment length

  const parts = [...fileParts, ...centralParts, new Uint8Array(end.buffer)];
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(new ArrayBuffer(total));
  let cursor = 0;
  for (const p of parts) {
    out.set(p, cursor);
    cursor += p.length;
  }
  return new Blob([out], { type: "application/zip" });
}
