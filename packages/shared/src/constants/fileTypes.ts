export type FileCategory = 'tabular' | 'document' | 'image';

export interface FileTypeConfig {
  category: FileCategory;
  extensions: string[];
  mimeTypes: string[];
  queryable: boolean;
}

export const SUPPORTED_FILE_TYPES: Record<string, FileTypeConfig> = {
  CSV: {
    category: 'tabular',
    extensions: ['.csv'],
    mimeTypes: ['text/csv'],
    queryable: true,
  },
  XLSX: {
    category: 'tabular',
    extensions: ['.xlsx'],
    mimeTypes: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    queryable: true,
  },
  XLS: {
    category: 'tabular',
    extensions: ['.xls'],
    mimeTypes: ['application/vnd.ms-excel'],
    queryable: true,
  },
  JSON: {
    category: 'tabular',
    extensions: ['.json'],
    mimeTypes: ['application/json'],
    queryable: true,
  },
  PDF: {
    category: 'document',
    extensions: ['.pdf'],
    mimeTypes: ['application/pdf'],
    queryable: false,
  },
  DOCX: {
    category: 'document',
    extensions: ['.docx'],
    mimeTypes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    queryable: false,
  },
  PNG: {
    category: 'image',
    extensions: ['.png'],
    mimeTypes: ['image/png'],
    queryable: false,
  },
  JPG: {
    category: 'image',
    extensions: ['.jpg', '.jpeg'],
    mimeTypes: ['image/jpeg', 'image/jpg'],
    queryable: false,
  },
};

/**
 * Returns an object formatted for react-dropzone's `accept` prop.
 * Example: { 'text/csv': ['.csv'], ... }
 */
export const getDropzoneAccept = (): Record<string, string[]> => {
  const accept: Record<string, string[]> = {};
  for (const config of Object.values(SUPPORTED_FILE_TYPES)) {
    for (const mime of config.mimeTypes) {
      if (!accept[mime]) {
        accept[mime] = [];
      }
      accept[mime].push(...config.extensions);
    }
  }
  return accept;
};

/**
 * Returns a flat list of all allowed extensions.
 */
export const getFlatAllowedExtensions = (): string[] => {
  return Object.values(SUPPORTED_FILE_TYPES).flatMap((config) => config.extensions);
};

/**
 * Checks if a given extension (e.g. '.csv' or 'csv') is in the allowed list.
 */
export const isExtensionAllowed = (ext: string): boolean => {
  const normalizedExt = ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`;
  return getFlatAllowedExtensions().includes(normalizedExt);
};

/**
 * Gets the file category based on its extension.
 */
export const getFileCategory = (ext: string): FileCategory | null => {
  const normalizedExt = ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`;
  for (const config of Object.values(SUPPORTED_FILE_TYPES)) {
    if (config.extensions.includes(normalizedExt)) {
      return config.category;
    }
  }
  return null;
};

/**
 * Checks if a file is queryable based on its extension.
 */
export const isQueryable = (ext: string): boolean => {
  const normalizedExt = ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`;
  for (const config of Object.values(SUPPORTED_FILE_TYPES)) {
    if (config.extensions.includes(normalizedExt)) {
      return config.queryable;
    }
  }
  return false;
};

/**
 * Gets the upper-case format identifier (e.g. 'CSV', 'DOCX') for a given extension.
 */
export const getFormatFromExtension = (ext: string): string | null => {
  const normalizedExt = ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`;
  for (const [key, config] of Object.entries(SUPPORTED_FILE_TYPES)) {
    if (config.extensions.includes(normalizedExt)) {
      return key;
    }
  }
  return null;
};
