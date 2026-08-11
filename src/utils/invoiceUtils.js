/**
 * Determines which month's invoice a transaction belongs to based on the closing day of the credit card.
 * @param {string} dateString - The transaction date in "YYYY-MM-DD" format.
 * @param {number} closingDay - The closing day of the credit card (e.g. 5, 10).
 * @returns {string} - The invoice month in "YYYY-MM" format.
 */
export const getInvoiceMonth = (dateString, closingDay) => {
  if (!dateString || !closingDay) return '';
  
  const [yearStr, monthStr, dayStr] = dateString.split('-');
  const year = parseInt(yearStr);
  const month = parseInt(monthStr) - 1; // Convert to 0-indexed month
  const day = parseInt(dayStr);

  const invoiceDate = new Date(year, month, 1);
  if (day > closingDay) {
    // If the transaction is after the closing day, it rolls over to the next month's invoice
    invoiceDate.setMonth(invoiceDate.getMonth() + 1);
  }

  const invoiceYear = invoiceDate.getFullYear();
  const invoiceMonth = String(invoiceDate.getMonth() + 1).padStart(2, '0');
  return `${invoiceYear}-${invoiceMonth}`;
};
