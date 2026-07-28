export const excelDateToJSDate = (
  serial,
  format = 1
) => {

  if (!serial) return "";
  
  // Si ya es un string que parece una fecha, devolverlo tal cual
  if (isNaN(serial)) {
    return String(serial).trim();
  }

  const excelEpoch = new Date(1899, 11, 30);

  const jsDate = new Date(
    excelEpoch.getTime() + serial * 86400000
  );

  const day = String(jsDate.getDate())
    .padStart(2, "0");

  const month = String(jsDate.getMonth() + 1)
    .padStart(2, "0");

  const shortYear = String(jsDate.getFullYear())
    .slice(-2);

  const year = jsDate.getFullYear();

  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const monthShort =
    monthNames[jsDate.getMonth()];

  switch (format) {

    // dd-mm-yyyy
    case 1:
      return `${day}-${month}-${year}`;

    // dd-mm-yy
    case 2:
      return `${day}-${month}-${shortYear}`;

    // dd-mmm-yyyy
    case 3:
      return `${day}-${monthShort}-${year}`;

    // yyyy-mm-dd
    case 4:
      return `${year}-${month}-${day}`;

    // dd/mm/yyyy
    case 5:
      return `${day}/${month}/${year}`;

    // ISO datetime
    case 6:
      return jsDate.toISOString();

    // Fecha JS
    case 7:
      return jsDate;

    default:
      return `${day}-${month}-${year}`;

  }

};