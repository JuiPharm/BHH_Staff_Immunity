/**
 * Template File Generator for Staff Immunity Registry
 * Generates downloadable CSV / Excel template files for user import.
 */

export function downloadCSV(filename: string, headers: string[], sampleRow: string[]) {
  const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
    + [headers.join(','), sampleRow.join(',')].join('\n');
  
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function downloadStaffMasterTemplate() {
  const headers = [
    'StaffID', 'HN', 'FirstName', 'LastName', 'DateOfBirth', 'Sex',
    'BloodGroup', 'Address', 'EmergencyPhone', 'Email', 'DepartmentCode', 'WorkGroup', 'StartDate'
  ];
  const sample = [
    'ST9001', 'HN123456', 'สมชาย', 'ใจดี', '1990-05-15', 'MALE',
    'O+', '123/45 ถ.เพชรเกษม หาดใหญ่', '0812345678', 'somchai@bdms.co.th', 'IC_DEPT', 'CLINICAL', '2026-01-01'
  ];
  downloadCSV('Staff_Master_Import_Template.csv', headers, sample);
}

export function downloadVaccinationTemplate() {
  const headers = [
    'StaffID', 'VaccineCategory', 'DoseNumber', 'AdministeredDate',
    'ManufacturerLot', 'ExpiryDate', 'AdministeredLocation'
  ];
  const sample = [
    'ST9001', 'HEPATITIS_B', '1', '2026-01-10', 'LOT-HBV-99', '2028-01-10', 'โรงพยาบาลกรุงเทพหาดใหญ่'
  ];
  downloadCSV('Vaccination_History_Import_Template.csv', headers, sample);
}

export function downloadLabScreeningTemplate() {
  const headers = [
    'StaffID', 'LabCategory', 'QuantitativeValue', 'Unit', 'QualitativeResult', 'TestDate', 'LabName'
  ];
  const sample = [
    'ST9001', 'ANTI_HBS', '125.4', 'mIU/mL', 'POSITIVE', '2026-01-15', 'BDMS Central Lab'
  ];
  downloadCSV('Lab_Screening_Import_Template.csv', headers, sample);
}
