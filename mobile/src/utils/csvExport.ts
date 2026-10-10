import { Share, Platform, Alert } from 'react-native';

/**
 * Sanitizes a single CSV value to prevent spreadsheet formula injection (CSV Injection).
 * Any value beginning with =, +, -, @, tab, or carriage return is prefixed with a single quote.
 * Quotation marks are escaped per RFC 4180.
 */
export function sanitizeCsvCell(val: any): string {
  if (val === null || val === undefined) {
    return '""';
  }

  let str = String(val).trim();

  // Guard against formula injection in spreadsheet applications (Excel, Google Sheets, LibreOffice)
  if (/^[=+\-@\t\r%]/.test(str)) {
    str = `'${str}`;
  }

  // Escape inner double quotes
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Assembles tabular data into an RFC 4180 compliant CSV string with sanitized values.
 */
export function buildCsvString(headers: string[], rows: (string | number | boolean | null | undefined)[][]): string {
  const sanitizedHeaders = headers.map(sanitizeCsvCell).join(',');
  const sanitizedRows = rows.map((row) => row.map(sanitizeCsvCell).join(','));
  return [sanitizedHeaders, ...sanitizedRows].join('\r\n');
}

export interface ShareResult {
  success: boolean;
  cancelled?: boolean;
  message: string;
}

/**
 * Triggers the native platform share sheet or download capability.
 * Safely handles cancellations, empty payloads, and platform failures without false success indicators.
 */
export async function exportAndShareCsv(
  filename: string,
  csvContent: string,
  subjectTitle: string = 'CampusBridge Institutional Report'
): Promise<ShareResult> {
  if (!csvContent || csvContent.trim().length === 0) {
    return {
      success: false,
      message: 'Dataset is empty. No records available to export.',
    };
  }

  try {
    const result = await Share.share(
      {
        title: filename,
        message: csvContent,
      },
      {
        dialogTitle: `Export ${filename}`,
        subject: subjectTitle,
      }
    );

    if (result.action === Share.sharedAction) {
      return {
        success: true,
        message: `Report "${filename}" shared successfully.`,
      };
    } else if (result.action === Share.dismissedAction) {
      return {
        success: false,
        cancelled: true,
        message: 'Report export was dismissed by user.',
      };
    }

    return {
      success: true,
      message: `Report "${filename}" processed.`,
    };
  } catch (error: any) {
    const errorMsg = error?.message || 'Failed to trigger native export dialog.';
    return {
      success: false,
      message: errorMsg,
    };
  }
}
