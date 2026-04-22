const should_accumulate = [
    "Elapsed Time",
    "Moving Time",
    "Calories",
    "Distance",
    "Distance (km)",
    "Elevation Gain",
];

const TIME_PATTERN = /([0-9]{2}):([0-9]{2}):([0-9]{2})/;
const table = document.getElementById("myTable");
const headerArr = [...table.getElementsByTagName("th")].map(th => th.innerText);
const dateColumnIndex = headerArr.indexOf("Date");
const topBtn = document.getElementById("backToTop");
const tooltip = document.getElementById('rowTooltip');

class Time {
    constructor(h, m, s) {
        this.h = parseInt(h) || 0;
        this.m = parseInt(m) || 0;
        this.s = parseInt(s) || 0;
    }

    add(other) {
        let totalSeconds = this.toSeconds() + other.toSeconds();
        return Time.fromSeconds(totalSeconds);
    }

    toSeconds() {
        return this.h * 3600 + this.m * 60 + this.s;
    }

    static fromSeconds(totalSeconds) {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        return new Time(h, m, s);
    }

    toString() {
        const pad = (v) => v.toString().padStart(2, '0');
        return `${pad(this.h)}:${pad(this.m)}:${pad(this.s)}`;
    }

    static fromString(str) {
        const obj = parseTime(str);
        return new Time(obj.h, obj.m, obj.s);
    }
}

function filterTable() {
    // 獲取選擇的日期數值
    const startDateInput = document.getElementById('startDate').value;
    const endDateInput = document.getElementById('endDate').value;

    // 將輸入轉為 Date 物件（若無輸入則設為極值）
    const start = startDateInput ? new Date(startDateInput.replace(/-/g, '/')) : null;
    const end = endDateInput ? new Date(endDateInput.replace(/-/g, '/')) : null;
    const tr = table.querySelector("tbody").getElementsByTagName("tr");

    // 從 index 1 開始（跳過 table header）
    for (let i = 0; i < tr.length; i++) {
        const td = tr[i].getElementsByTagName("td")[dateColumnIndex];
        if (td) {
            const rowDate = new Date(td.textContent || td.innerText);
            let showRow = true;

            // 判斷邏輯
            if (start && rowDate < start) {
                showRow = false;
            }
            // 結束日期通常要設為該日的 23:59:59，這裡簡單處理
            if (end) {
                const endLimit = new Date(end);
                endLimit.setHours(23, 59, 59);
                if (rowDate > endLimit) {
                    showRow = false;
                }
            }

            // 執行隱藏或顯示
            tr[i].style.display = showRow ? "" : "none";
        }
    }
    accumulateTable();
}

function accumulateTable() {
    const tr = table.querySelector("tbody").getElementsByTagName("tr");
    const acc = Array(headerArr.length).fill(null);
    for (let i = 0; i < tr.length; ++i) {
        if (tr[i].style.display === 'none') continue;

        const tds = tr[i].querySelectorAll("td");

        for (let j = 0; j < headerArr.length; ++j) {
            if (!should_accumulate.includes(headerArr[j])) continue;

            const data = tds[j].innerText;

            if (isTime(data)) {
                const curr = Time.fromString(data);
                acc[j] = (acc[j] ?? new Time(0, 0, 0)).add(curr);
            } else {
                const curr = parseFloat(data) || 0;
                acc[j] = (acc[j] ?? 0) + curr;
                if (headerArr[j] === 'Elevation Gain') {
                }
            }
        }
    }
    // Add tfoot
    let tfoot = table.querySelector('tfoot');
    if (tfoot) {
        tfoot.remove();
    }
    tfoot = document.createElement('tfoot');
    const footerRow = document.createElement('tr');


    headerArr.forEach((headerName, j) => {
        const td = document.createElement('td');

        if (headerName === "Name") {
            td.innerText = "Summary";
        }
        // 如果該索引在 acc 裡有值，則填入
        else if (acc[j] !== null) {
            const val = acc[j];
            // 判斷是 Time 物件還是普通數字
            if (val instanceof Time) {
                td.innerText = val.toString();
            } else {
                td.innerText = val.toFixed(2);
            }
        } else {
            td.innerText = "";
        }

        footerRow.appendChild(td);
    });

    tfoot.appendChild(footerRow);
    table.appendChild(tfoot);
}

accumulateTable();  // 先加總總表

function resetFilter() {
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    filterTable();
}

function isTime(input) {
    return TIME_PATTERN.test(input);
}

function parseTime(input) {
    const match = input.match(TIME_PATTERN);
    return {
        h: parseInt(match[1]),
        m: parseInt(match[2]),
        s: parseInt(match[3]),
    }
}

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
    // 1. 先確保顯示，這樣 offsetWidth 才有值
    if (tooltip.style.display !== 'block') {
        tooltip.style.display = 'block';
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
