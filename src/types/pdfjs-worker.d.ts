declare module "pdfjs-dist/legacy/build/pdf.mjs" {
  export const getDocument: (src: unknown) => { promise: Promise<any> };
}

declare module "pdfjs-dist/legacy/build/pdf.worker.mjs" {
  export const WorkerMessageHandler: unknown;
}
