import type {
  OpenedDictionaryFile,
  OpenedTextFile,
  SavedTextFile,
  SaveTextFileInput,
} from '@writemelo/contracts';

interface WritableFileHandle {
  name: string;
  getFile(): Promise<File>;
  createWritable(): Promise<{
    write(data: string): Promise<void>;
    close(): Promise<void>;
  }>;
}

interface FilePickerWindow {
  showOpenFilePicker?(options: unknown): Promise<WritableFileHandle[]>;
  showSaveFilePicker?(options: unknown): Promise<WritableFileHandle>;
}

const browserHandles = new Map<string, WritableFileHandle>();
const extensions = ['.txt', '.text', '.md', '.markdown'] as const;
const pickerTypes = [{
  description: 'Text and Markdown',
  accept: {
    'text/plain': ['.txt', '.text'],
    'text/markdown': ['.md', '.markdown'],
  },
}];

export function isSupportedTextFileName(name: string): boolean {
  const lowerName = name.toLowerCase();
  return extensions.some(extension => lowerName.endsWith(extension));
}

export async function openTextFile(): Promise<OpenedTextFile | null> {
  const desktop = window.writeMeloDesktop?.files;
  if (desktop) return desktop.open();

  const picker = window as unknown as FilePickerWindow;
  if (!picker.showOpenFilePicker) throw new Error('This browser does not support opening local files.');
  const handles = await picker.showOpenFilePicker({
    multiple: false,
    types: pickerTypes,
    excludeAcceptAllOption: true,
  });
  const handle = handles[0];
  if (!handle) return null;
  if (!isSupportedTextFileName(handle.name)) throw new Error('Use .txt, .text, .md, or .markdown.');
  const file = await handle.getFile();
  if (file.size > 10 * 1024 * 1024) throw new Error('Files larger than 10 MB are not supported.');
  const reference = `browser:${crypto.randomUUID()}`;
  browserHandles.set(reference, handle);
  return { name: handle.name, reference, content: await file.text() };
}

export async function openDictionaryFile(): Promise<OpenedDictionaryFile | null> {
  const desktop = window.writeMeloDesktop?.files;
  if (desktop) return desktop.openDictionary();

  const picker = window as unknown as FilePickerWindow;
  if (!picker.showOpenFilePicker) throw new Error('This browser does not support importing local dictionaries.');
  const handles = await picker.showOpenFilePicker({
    multiple: false,
    types: [{
      description: 'Dictionary files',
      accept: { 'text/plain': ['.txt', '.dic'] },
    }],
    excludeAcceptAllOption: true,
  });
  const handle = handles[0];
  if (!handle) return null;
  const lowerName = handle.name.toLowerCase();
  if (!lowerName.endsWith('.txt') && !lowerName.endsWith('.dic')) {
    throw new Error('Use a .txt or .dic dictionary.');
  }
  const file = await handle.getFile();
  if (file.size > 10 * 1024 * 1024) throw new Error('Dictionary files larger than 10 MB are not supported.');
  return { name: handle.name, content: await file.text() };
}

export async function saveTextFile(input: SaveTextFileInput): Promise<SavedTextFile | null> {
  const desktop = window.writeMeloDesktop?.files;
  if (desktop) return desktop.save(input);

  const picker = window as unknown as FilePickerWindow;
  let handle = input.saveAs || !input.reference
    ? undefined
    : browserHandles.get(input.reference);
  if (!handle) {
    if (!picker.showSaveFilePicker) throw new Error('This browser does not support saving local files.');
    handle = await picker.showSaveFilePicker({
      suggestedName: input.suggestedName,
      types: pickerTypes,
      excludeAcceptAllOption: true,
    });
  }
  if (!isSupportedTextFileName(handle.name)) throw new Error('Use .txt, .text, .md, or .markdown.');
  const writable = await handle.createWritable();
  await writable.write(input.content);
  await writable.close();
  const reference = input.saveAs || !input.reference
    ? `browser:${crypto.randomUUID()}`
    : input.reference;
  browserHandles.set(reference, handle);
  return { name: handle.name, reference };
}
