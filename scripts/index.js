import { parseTableToRows, onOpenDialog, onCloseDialog, onDialogClose,
         onDownloadReport } from "./utils.js";


const dialog = document.getElementById('reportDialog');
const openBtn = document.getElementById('openReportBtn');
const cancelBtn = document.getElementById('cancelBtn');
const downloadBtn = document.getElementById("downloadBtn");

const rows = [];
const types = ["Swim", "Ride", "Run", "WeightTraining"];
for (const type of types) {
    const res = await fetch(`${type}.html`);
    const text = await res.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "text/html");
    const table = doc.getElementById("myTable");
    const _rows = parseTableToRows(type, table);
    rows.push(..._rows);
}

openBtn.addEventListener("click", onOpenDialog);
cancelBtn.addEventListener('click', onCloseDialog);
dialog.addEventListener('close', () => {
    onDialogClose(rows);
});
document.getElementById('confirmBtn').addEventListener('click', (e) => {
    dialog.close('confirm');
});
downloadBtn.addEventListener("click", onDownloadReport);
