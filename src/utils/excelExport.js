import ExcelJS from 'exceljs';

export const exportDetailedExcel = async ({ title, filename, dataBlocks, summaryData }) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('التقرير المالي');

  // Set default properties
  sheet.views = [{ rightToLeft: true }]; // Arabic friendly
  
  let currentRow = 1;

  // 1. Header Section
  const headerRow = sheet.getRow(currentRow);
  headerRow.values = [title];
  sheet.mergeCells(currentRow, 1, currentRow, 5);
  headerRow.height = 40;
  headerRow.getCell(1).font = { size: 20, bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF064E3B' } };
  headerRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
  currentRow += 2;

  // 2. Summary Boxes (Accountant Style)
  if (summaryData) {
    summaryData.forEach((item) => {
      const row = sheet.getRow(currentRow);
      row.values = [item.label, item.value, item.note || ''];
      
      const labelCell = row.getCell(1);
      const valueCell = row.getCell(2);
      
      labelCell.font = { bold: true };
      labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      
      valueCell.font = { bold: true, size: 14, color: { argb: item.color || 'FF000000' } };
      valueCell.numFmt = '#,##0.00 "ج.م"';
      
      row.height = 25;
      currentRow++;
    });
    currentRow += 2;
  }

  // 3. Data Blocks (Tables)
  dataBlocks.forEach((block) => {
    // Block Title
    const titleRow = sheet.getRow(currentRow);
    titleRow.values = [block.title];
    sheet.mergeCells(currentRow, 1, currentRow, block.headers.length);
    titleRow.getCell(1).font = { bold: true, size: 14 };
    titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    currentRow++;

    // Headers
    const headRow = sheet.getRow(currentRow);
    headRow.values = block.headers;
    headRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
      cell.alignment = { horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
    currentRow++;

    // Data Rows with Date Grouping Logic
    let lastDate = '';
    
    block.rows.forEach((rowData, idx) => {
      let finalRowData = rowData;

      // Special handling for the detailed monthly expense block
      if (block.title.includes("بيان الخوارج اليومية المفصلة")) {
        const currentDate = rowData[0]; // Assuming Date is the first column
        finalRowData = rowData.slice(1); // Remove date from the row data
        
        if (currentDate !== lastDate) {
          // Insert Date Header Row
          const dateRow = sheet.getRow(currentRow);
          dateRow.values = [currentDate];
          sheet.mergeCells(currentRow, 1, currentRow, block.headers.length);
          
          const cell = dateRow.getCell(1);
          cell.font = { bold: true, size: 12, color: { argb: 'FF1E293B' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDE68A' } }; // Amber-200
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = {
            top: { style: 'medium' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
          
          currentRow++;
          lastDate = currentDate;
        }
      }

      const row = sheet.getRow(currentRow);
      row.values = finalRowData;
      row.eachCell((cell, colIdx) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        // Zebra striping for normal rows
        if (idx % 2 === 0) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        }
      });
      currentRow++;
    });
    currentRow += 2;
  });

  // Auto-column widths
  sheet.columns.forEach(column => {
    column.width = 25;
  });

  // Export
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.URL.revokeObjectURL(url);
};
