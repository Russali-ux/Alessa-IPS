import * as XLSX from "xlsx";

export async function importExcel(file) {

  return new Promise((resolve, reject) => {

    const reader = new FileReader();

    reader.onload = (evt) => {

      try {

        const data = evt.target.result;

        const workbook = XLSX.read(data, {
          type: "binary",
        });

        const sheetName = workbook.SheetNames[0];

        const worksheet = workbook.Sheets[sheetName];

        // ✅ ARRAY MODE
        const json = XLSX.utils.sheet_to_json(
          worksheet,
          {
            header: 1,
          }
        );

        resolve(json);

      } catch (error) {

        reject(error);

      }

    };

    reader.readAsBinaryString(file);

  });

}