// utils/csvParser.js — Parse uploaded CSV file for bulk intern import
const XLSX = require('xlsx');
const path = require('path');

/**
 * Parse a CSV (or XLSX) file and return an array of intern objects.
 * Expected columns: name, email, phone, college, joiningDate, endDate, module, skillLevel
 * joiningDate and endDate should be YYYY-MM-DD strings.
 */
exports.parseInternCsv = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  let workbook;

  if (ext === '.csv') {
    workbook = XLSX.readFile(filePath, { type: 'file', raw: false });
  } else if (ext === '.xlsx' || ext === '.xls') {
    workbook = XLSX.readFile(filePath);
  } else {
    throw new Error('Unsupported file format. Please upload a CSV or Excel file.');
  }

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (!rows.length) {
    throw new Error('The uploaded file is empty or has no data rows.');
  }

  const required = ['name', 'email', 'joiningDate', 'endDate'];
  const firstRow = rows[0];
  const keys = Object.keys(firstRow).map((k) => k.toLowerCase().trim());

  for (const req of required) {
    if (!keys.includes(req.toLowerCase())) {
      throw new Error(`Missing required column: "${req}". Columns found: ${keys.join(', ')}`);
    }
  }

  const interns = rows.map((row, i) => {
    // Normalize keys to lowercase
    const normalized = {};
    Object.keys(row).forEach((k) => {
      normalized[k.toLowerCase().trim()] = String(row[k]).trim();
    });

    return {
      name: normalized.name || '',
      email: (normalized.email || '').toLowerCase(),
      phone: normalized.phone || '',
      college: normalized.college || '',
      joiningDate: normalized.joiningdate || normalized['joining date'] || '',
      endDate: normalized.enddate || normalized['end date'] || '',
      moduleName: normalized.module || normalized.currentmodule || '',
      skillLevel: normalized.skilllevel || normalized['skill level'] || 'beginner',
      mentorEmail: normalized.mentoremail || normalized['mentor email'] || '',
      _rowIndex: i + 2, // 1-based, accounting for header row
    };
  });

  // Basic validation
  const errors = [];
  interns.forEach((intern) => {
    if (!intern.name) errors.push(`Row ${intern._rowIndex}: name is required`);
    if (!intern.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(intern.email)) {
      errors.push(`Row ${intern._rowIndex}: invalid email "${intern.email}"`);
    }
    if (!intern.joiningDate) errors.push(`Row ${intern._rowIndex}: joiningDate is required`);
    if (!intern.endDate) errors.push(`Row ${intern._rowIndex}: endDate is required`);
  });

  if (errors.length) {
    throw new Error(`CSV validation errors:\n${errors.slice(0, 10).join('\n')}${errors.length > 10 ? `\n...and ${errors.length - 10} more` : ''}`);
  }

  return interns;
};
