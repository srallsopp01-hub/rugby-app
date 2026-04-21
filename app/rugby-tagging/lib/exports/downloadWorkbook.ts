// Small helper to trigger a browser download for a generated workbook.
// Kept separate so the workbook builder stays environment-agnostic.

export function downloadWorkbook(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}