/**
 * Utilidad para exportación de datos tabulares a formato CSV compatible con Microsoft Excel y Google Sheets.
 * Incluye Byte Order Mark (BOM) UTF-8 para garantizar la visualización correcta de tildes y símbolos de moneda.
 */

export interface CsvColumn<T = object> {
  header: string;
  accessor: keyof T | ((row: T) => string | number | null | undefined);
}

export function exportToCSV<T extends object>(
  filename: string,
  columns: CsvColumn<T>[],
  data: T[]
): void {
  if (!data || data.length === 0) {
    alert("No hay datos disponibles para exportar");
    return;
  }

  // 1. Cabeceras
  const headerRow = columns.map((col) => `"${col.header.replace(/"/g, '""')}"`).join(",");

  // 2. Filas de datos
  const dataRows = data.map((row) => {
    return columns
      .map((col) => {
        let value: unknown;
        if (typeof col.accessor === "function") {
          value = col.accessor(row);
        } else {
          value = (row as Record<string, unknown>)[col.accessor as string];
        }

        if (value === null || value === undefined) {
          return '""';
        }

        // Convertir fechas si aplica
        if (value instanceof Date) {
          value = value.toLocaleDateString("es-VE");
        }

        const stringValue = String(value).replace(/"/g, '""');
        return `"${stringValue}"`;
      })
      .join(",");
  });

  // 3. Unir con salto de línea estándar
  const csvContent = [headerRow, ...dataRows].join("\r\n");

  // 4. Agregar BOM UTF-8 (\uFEFF) para compatibilidad con Excel
  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  // 5. Descargar archivo
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename.replace(/\.csv$/i, "")}_${new Date().toISOString().split("T")[0]}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
