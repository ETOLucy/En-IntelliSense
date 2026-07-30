import { dialog, ipcMain, type IpcMainInvokeEvent } from 'electron';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { basename, extname, normalize } from 'node:path';
import type {
  OpenedDictionaryFile,
  OpenedTextFile,
  SavedTextFile,
  SaveTextFileInput,
} from '@writemelo/contracts';

const supportedExtensions = new Set(['.txt', '.text', '.md', '.markdown']);
const maximumFileBytes = 10 * 1024 * 1024;

interface FileHandlerOptions {
  isTrustedSender: (event: IpcMainInvokeEvent) => boolean;
}

function supportedPath(path: string) {
  return supportedExtensions.has(extname(path).toLowerCase());
}

function fileFilters() {
  return [
    { name: 'Text and Markdown', extensions: ['txt', 'text', 'md', 'markdown'] },
    { name: 'Plain text', extensions: ['txt', 'text'] },
    { name: 'Markdown', extensions: ['md', 'markdown'] },
  ];
}

function parseSaveInput(value: unknown): SaveTextFileInput {
  if (!value || typeof value !== 'object') throw new Error('Invalid save request.');
  const input = value as Partial<SaveTextFileInput>;
  if (
    typeof input.content !== 'string'
    || typeof input.suggestedName !== 'string'
    || typeof input.saveAs !== 'boolean'
    || (input.reference !== undefined && typeof input.reference !== 'string')
  ) throw new Error('Invalid save request.');
  if (Buffer.byteLength(input.content, 'utf8') > maximumFileBytes) {
    throw new Error('Files larger than 10 MB are not supported.');
  }
  return {
    content: input.content,
    suggestedName: basename(input.suggestedName) || 'Untitled.md',
    saveAs: input.saveAs,
    ...(input.reference ? { reference: input.reference } : {}),
  };
}

export function registerFileHandlers({ isTrustedSender }: FileHandlerOptions) {
  const authorizedPaths = new Set<string>();

  ipcMain.handle('files:open', async (event): Promise<OpenedTextFile | null> => {
    if (!isTrustedSender(event)) throw new Error('Untrusted file request.');
    const result = await dialog.showOpenDialog({
      title: 'Open a text document',
      properties: ['openFile'],
      filters: fileFilters(),
    });
    const selected = result.filePaths[0];
    if (result.canceled || !selected) return null;
    if (!supportedPath(selected)) throw new Error('This file type is not supported.');
    const metadata = await stat(selected);
    if (metadata.size > maximumFileBytes) throw new Error('Files larger than 10 MB are not supported.');
    const path = normalize(selected);
    const content = await readFile(path, 'utf8');
    authorizedPaths.add(path);
    return { name: basename(path), reference: path, content };
  });

  ipcMain.handle('files:open-dictionary', async (event): Promise<OpenedDictionaryFile | null> => {
    if (!isTrustedSender(event)) throw new Error('Untrusted dictionary request.');
    const result = await dialog.showOpenDialog({
      title: 'Import a personal dictionary',
      properties: ['openFile'],
      filters: [{ name: 'Dictionary files', extensions: ['txt', 'dic'] }],
    });
    const selected = result.filePaths[0];
    if (result.canceled || !selected) return null;
    const extension = extname(selected).toLowerCase();
    if (extension !== '.txt' && extension !== '.dic') throw new Error('Use a .txt or .dic dictionary.');
    const metadata = await stat(selected);
    if (metadata.size > maximumFileBytes) throw new Error('Dictionary files larger than 10 MB are not supported.');
    return { name: basename(selected), content: await readFile(selected, 'utf8') };
  });

  ipcMain.handle('files:save', async (event, value: unknown): Promise<SavedTextFile | null> => {
    if (!isTrustedSender(event)) throw new Error('Untrusted file request.');
    const input = parseSaveInput(value);
    let path = input.saveAs ? undefined : input.reference;
    if (!path || !authorizedPaths.has(normalize(path))) {
      const result = await dialog.showSaveDialog({
        title: 'Save text document',
        defaultPath: input.suggestedName,
        filters: fileFilters(),
      });
      if (result.canceled || !result.filePath) return null;
      path = result.filePath;
    }
    if (!supportedPath(path)) throw new Error('Use .txt, .text, .md, or .markdown.');
    const normalizedPath = normalize(path);
    await writeFile(normalizedPath, input.content, 'utf8');
    authorizedPaths.add(normalizedPath);
    return { name: basename(normalizedPath), reference: normalizedPath };
  });
}
