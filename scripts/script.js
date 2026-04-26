import * as d3 from "d3";
import { Time, colorScale, resetFilter, filterTable, accumulateTable,
         parseTableToRows, onOpenDialog, onCloseDialog, onDialogClose,
         onDownloadReport } from "./utils.js";

const type = window.location.pathname.split("/").pop().replace(".html", "");
const table = document.getElementById("myTable");
const headerArr = [...table.getElementsByTagName("th")].map(th => th.innerText);
const topBtn = document.getElementById("backToTop");
const tooltip = document.getElementById('rowTooltip');
const dialog = document.getElementById('reportDialog');
const openBtn = document.getElementById('openReportBtn');
const cancelBtn = document.getElementById('cancelBtn');
const downloadBtn = document.getElementById("downloadBtn");

document.getElementById("startDate").addEventListener("change", filterTable);
document.getElementById("endDate").addEventListener("change", e => {
    const start = document.getElementById("startDate").value;
    const end = document.getElementById("endDate").value;
    if (!start || !end)
        return;
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (endDate < startDate) {
        // 如果end比start還前面，就設定end與start同一天
        document.getElementById("endDate").value = start;
    }
    filterTable();
});
document.getElementById("reset").addEventListener("click", resetFilter);

accumulateTable();  // 先加總總表
const rows = parseTableToRows(type, table);

window.onscroll = function() {
    if (document.body.scrollTop > 200 || document.documentElement.scrollTop > 200) {
        topBtn.style.display = "block";
    } else {
        topBtn.style.display = "none";
    }
};

// 點擊事件：平滑捲動到頂部
topBtn.onclick = function() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth' // 平滑捲動效果
    });
};

// 滑鼠事件
// 監聽 mouseover：判斷是否進入資料行
table.addEventListener('mouseover', (e) => {
    const tr = e.target.closest('tbody tr'); // 僅針對 tbody 內的 tr
    if (tr) {
        const allRows = Array.from(tr.parentElement.rows);
        const visibleIndex = allRows.
            filter(row => row.style.display !== 'none')
            .indexOf(tr) + 1;
        if (visibleIndex > 0) {
            tooltip.innerHTML = `第 ${visibleIndex} 個活動`;
            tooltip.style.display = 'block';
        }
    }
});

// 監聽 mousemove：讓 Tooltip 跟隨滑鼠
table.addEventListener('mousemove', (e) => {
    // 1. 如果沒顯示，就不需要更新
    if (tooltip.style.display !== 'block') {
        return;
    }

    const offset = 15;
    let x = e.clientX + offset;
    let y = e.clientY + offset;

    // 2. 取得當前 Tooltip 的寬高
    const tipWidth = tooltip.offsetWidth;
    const tipHeight = tooltip.offsetHeight;

    // 3. 邊界判斷
    if (x + tipWidth > window.innerWidth) {
        x = e.clientX - tipWidth - offset;
    }

    if (y + tipHeight > window.innerHeight) {
        y = e.clientY - tipHeight - offset;
    }

    // 4. 強制確保不會變成負數 (保險機制)
    x = Math.max(5, x);
    y = Math.max(5, y);

    tooltip.style.left = x + 'px';
    tooltip.style.top = y + 'px';
});

// 監聽 mouseout：離開表格或行時隱藏
table.addEventListener('mouseout', (e) => {
    // 檢查是否真的離開了 tr
    if (!e.relatedTarget || !e.relatedTarget.closest('tbody tr')) {
        tooltip.style.display = 'none';
    }
});

openBtn.addEventListener("click", onOpenDialog);
cancelBtn.addEventListener('click', onCloseDialog);
dialog.addEventListener('close', () => {
    onDialogClose(rows);
});
document.getElementById('confirmBtn').addEventListener('click', (e) => {
    dialog.close('confirm');
});
downloadBtn.addEventListener("click", onDownloadReport);
