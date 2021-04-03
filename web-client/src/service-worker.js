/* eslint-disable no-restricted-globals */

import { Buffer } from "safe-buffer";
import { decryptChunk } from "./helpers/decrypt";

const CHUNK_SIZE = 0x400000;

let ignored = self.__WB_MANIFEST;

self.addEventListener('install', function (event) {
  self.skipWaiting();
  console.log("Instalando");
});

self.addEventListener('activate', function(event) {
  event.waitUntil(self.clients.claim());
  console.log("Ativando");
});

let downloads = [];
let active = [];

self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'info') {
    let { fileHandler, fileKey, fileNonce, fileName, fileSize, fileUrl, macs } = event.data.info;

    let timestamp = Date.now();
    downloads = downloads.filter(d => (d.fileHandler !== fileHandler) && ((timestamp - d.timestamp) < 24 * 60 * 60 * 1000)); // 1 dia

    let fakeUrl = '/file/' + timestamp.toString(36);
    downloads.push({
      fakeUrl,
      timestamp,
      macs,
      fileKey,
      fileUrl,
      fileName,
      fileSize,
      fileNonce,
      fileHandler,
    });

    self.clients.matchAll().then(clients => {
      clients.forEach(client => client.postMessage({
        type: 'link',
        info: {
          fileHandler,
          fakeUrl,
        },
      }));
    });
  } else if (event.data && event.data.type === 'abort') {
    let idx = active.findIndex(a => a.fakeUrl === event.data.fakeUrl);
    if (idx > -1) {
      let { abortController } = active.splice(idx, 1)[0];
      abortController.abort();
    }
  }
});

/** @param {ReadableStreamController<any>} controller */
function decryptQueue (controller, info) {
  let key = Buffer.from(info.fileKey);
  let nonce = Buffer.from(info.fileNonce);
  let macs = info.macs.map(m => Buffer.from(m));
  let i = 0;
  let ctr = 0;
  let encSize = 0;

  let closed = false;
  return {
    enqueue (chunk) {
      if (closed) return;
      encSize += chunk.length;
      const macS = i*(CHUNK_SIZE/0x100000), macE = (i+1)*(CHUNK_SIZE/0x100000);
      let dChunk = decryptChunk(chunk, key, nonce, macs.slice(macS, macE), ctr);
      ctr = dChunk.ctr;

      let a = encSize > info.fileSize ? encSize - info.fileSize : 0;
      controller.enqueue(dChunk.decryptedChunk.slice(0, dChunk.decryptedChunk.length - a));
      i++;
    },
    close() {
      closed = true;
      controller.close();
    }
  }
}

/** @param {ReadableStreamController<any>} controller */
function createDecrypter(controller, info) {
  let buf = Buffer.allocUnsafe(0);
  let queue = decryptQueue(controller, info);
  return {
    /** @param {Uint8Array} value */
    enqueue (value) {
      let buffer = buf.length > 0 ? Buffer.concat([buf, Buffer.from(value)]) : Buffer.from(value);
      while (buffer.length >= CHUNK_SIZE) {
        let chunk = buffer.slice(0, CHUNK_SIZE);
        buffer = buffer.slice(CHUNK_SIZE);
        queue.enqueue(chunk);
      }
      buf = buffer;
    },
    close () {
      if (buf.length > 0) queue.enqueue(buf);
      buf = null;
      queue.close();
    }
  };
}



self.addEventListener('fetch', async function (event) {
  const url = new URL(event.request.url);
  if (url.origin === location.origin && url.pathname.startsWith('/file/')) {
    let fileIdx = downloads.findIndex(d => d.fakeUrl === url.pathname);
    if (fileIdx === -1) {
      return event.respondWith(new Response("404 Not Found", { status: 404 }));
    }

    let file = downloads.splice(fileIdx, 1)[0];
      
    
    const abortController = new AbortController();
    const signal = abortController.signal;
    
    const stream = new ReadableStream({
      async start(controller) {
        let decrypter = createDecrypter(controller, file);

        let reader = await fetch(file.fileUrl, { signal }).then(response => response.body.getReader());
        while (1) {
          let { done, value } = await reader.read();
          if (done) {
            active = active.filter(a => a.fakeUrl !== url.pathname);
            decrypter.close();
            return;
          };

          decrypter.enqueue(value);
          self.clients.matchAll().then(clients => {
            clients.forEach(client => client.postMessage({
              type: 'progress',
              timestamp: Date.now(),
              fileHandler: file.fileHandler,
              progress: value.length,
            }));
          });
        }
      },
      async cancel() {
        console.log("Cancelou tudo")
        abortController.abort();
      }
    });

    active.push({
      fakeUrl: url.pathname,
      abortController,
    });

    return event.respondWith(new Promise(resolve => {
      let response = new Response(stream);
      response.headers.append('Content-Disposition', `attachment; filename="${file.fileName}"`);
      response.headers.append('Content-Length', file.fileSize);
      resolve(response);
    }));
  }
});