// Web stand-in for expo-file-system. In the browser it only has to read the bytes of
// a picked file (a blob: or http URL) for upload; the local cache and copies are skipped.
type Part = string | { uri: string };

function join(parts: Part[]) {
  return parts.map((p) => (typeof p === 'string' ? p : p.uri)).join('/').replace(/([^:])\/{2,}/g, '$1/');
}

export class File {
  uri: string;
  exists = false;
  constructor(...parts: Part[]) {
    this.uri = join(parts);
  }
  async text() {
    return (await fetch(this.uri)).text();
  }
  async arrayBuffer() {
    return (await fetch(this.uri)).arrayBuffer();
  }
  copy(_to?: unknown) {}
  write(_data?: unknown) {}
  delete() {}
  create() {}
}

export class Directory {
  uri: string;
  exists = false;
  constructor(...parts: Part[]) {
    this.uri = join(parts);
  }
  create(_options?: unknown) {}
  delete() {}
  list(): (File | Directory)[] {
    return [];
  }
}

export const Paths = { cache: 'web-cache', document: 'web-doc' };
