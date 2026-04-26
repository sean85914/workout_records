import * as d3 from "d3";


const should_accumulate = [
    "Elapsed Time",
    "Moving Time",
    "Calories",
    "Distance",
    "Distance (km)",
    "Elevation Gain",
];
const type = window.location.pathname.split("/")[1].replace(".html", "");

const TIME_PATTERN = /([0-9]{2}):([0-9]{2}):([0-9]{2})/;
const table = document.getElementById("myTable");
const headerArr = [...table.getElementsByTagName("th")].map(th => th.innerText);
const dateColumnIndex = headerArr.indexOf("Date");
const topBtn = document.getElementById("backToTop");
const tooltip = document.getElementById('rowTooltip');
const dialog = document.getElementById('reportDialog');
const openBtn = document.getElementById('openReportBtn');
const cancelBtn = document.getElementById('cancelBtn');

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

// 建立所有紀錄的起始/終止時間
const rows = [];
const tr = table.querySelector("tbody").querySelectorAll("tr");
const dateIndex = headerArr.indexOf("Date");
const durationIndex = headerArr.indexOf("Elapsed Time");
tr.forEach(row => {
    const tds = row.querySelectorAll("td");
    const start = new Date(tds[dateIndex].innerText);
    const duration = Time.fromString(tds[durationIndex].innerText);
    let end = new Date(start);
    end.setHours(
        end.getHours() + duration.h,
        end.getMinutes() + duration.m,
        end.getSeconds() + duration.s
    );
    rows.push({
        start: start,
        end: end,
        type: type
    });
})

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

openBtn.addEventListener("click", e => {
    const today = new Date();
    document.getElementById("reportTargetMonth").value = `${today.getFullYear()}-${today.getMonth() + 1}`;
    dialog.showModal();
})

cancelBtn.addEventListener('click', () => {
    dialog.close();
});

dialog.addEventListener('close', () => {
    if (dialog.returnValue === 'confirm') { // 可以在這裡判斷是否點擊確定
        const selectedValue = document.getElementById('reportTargetMonth').value;
        // selectedValue 格式為 "YYYY-MM" (例如 "2025-02")
        const [year, month] = selectedValue.split('-').map(Number);
        if (year && month) {
            generateChart(year, month - 1); // 月份要 -1
        }
    }
});

document.getElementById('confirmBtn').addEventListener('click', (e) => {
    dialog.close('confirm');
});

function generateChart(year, monthIndex) {
    // A. 清除舊圖表
    d3.select("#chart").selectAll("*").remove();

    // B. 計算該月的起始與結束時間
    const startDate = new Date(year, monthIndex, 1);
    const endDate = new Date(year, monthIndex + 1, 0); // 下個月第0天就是本月最後一天

    const margin = { top: 50, right: 30, bottom: 50, left: 60 };
    const width = 1000 - margin.left - margin.right;
    const height = 600 - margin.top - margin.bottom;

    const filterRows = rows.filter(row => {
        const d = new Date(row.start);
        return d.getFullYear() === year && d.getMonth() === monthIndex;
    })

    // C. 重新定義 X 軸比例尺
    const xScale = d3.scaleTime()
        .domain([
            d3.timeHour.offset(startDate, -12),
            d3.timeHour.offset(endDate, 12)
        ])
        .range([0, width]);

    const svg = d3.select("#chart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Y 軸：一天 24 小時 (00:00 在上，24:00 在下)
    const yScale = d3.scaleTime()
        .domain([new Date(year, monthIndex, 1, 0, 0), new Date(year, monthIndex, 1, 23, 59, 59)])
        .range([0, height]);

    // 顏色映射
    const colorScale = d3.scaleOrdinal()
        .domain(["WeightTraining", "Run", "Swim", "Ride"])
        .range(["yellow", "red", "blue", "green"]);

    // 4. 繪製背景格線 (Grid)
    svg.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(yScale)
            .ticks(d3.timeHour.every(3))
            .tickSize(-width)
            .tickFormat("")
        );

    // 5. 繪製運動色塊
    svg.selectAll(".workout-bar")
        .data(filterRows)
        .enter()
        .append("rect")
        .attr("class", "workout-bar")
        .attr("x", d => {
            const dCopy = new Date(d.start);
            dCopy.setHours(0, 0, 0, 0);
            return xScale(dCopy) - 8; // 偏移讓方塊置中
        })
        .attr("y", d => {
            // 統一日期後計算 Y 座標
            const timeOnly = new Date(year, monthIndex, 1, d.start.getHours(), d.start.getMinutes());
            return yScale(timeOnly);
        })
        .attr("width", 16)
        .attr("height", d => {
            const s = new Date(year, monthIndex, 1, d.start.getHours(), d.start.getMinutes());
            const e = new Date(year, monthIndex, 1, d.end.getHours(), d.end.getMinutes());
            return yScale(e) - yScale(s);
        })
        .attr("fill", d => colorScale(d.type))
        .attr("stroke", "#333")
        .attr("stroke-width", 0.5);

    // 6. 繪製座標軸
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale).ticks(d3.timeDay.every(1)).tickFormat(d3.timeFormat("%d")));

    svg.append("g")
        .attr("transform", `translate(${width}, 0)`)
        .call(d3.axisRight(yScale)
            .tickSize(0)      // 不要刻度線
            .tickFormat("")   // 不要文字
        );

    svg.append("g")
        .call(d3.axisLeft(yScale).ticks(d3.timeHour.every(3)).tickFormat(d3.timeFormat("%H:%M")));

    svg.append("text")
        .attr("x", width / 2)             // 置中
        .attr("y", -margin.top / 2)       // 放在 margin 的空間裡
        .attr("text-anchor", "middle")    // 文字錨點設為中間
        .style("font-size", "20px")
        .style("font-weight", "bold")
        .text(`${year}/${monthIndex + 1}`);

    document.getElementById("chart").scrollIntoView({
        behavior: 'smooth', // 平滑捲動，不會突兀地跳過去
        block: 'start'      // 讓元素頂端對齊視窗頂端
    });
}
