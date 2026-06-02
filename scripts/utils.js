import * as d3 from "d3";


const should_accumulate = [
    "Elapsed Time",
    "Moving Time",
    "Calories",
    "Distance",
    "Distance (km)",
    "Elevation Gain",
];

const TIME_PATTERN = /([0-9]{2}):([0-9]{2}):([0-9]{2})/;
// 顏色映射
export const colorScale = d3.scaleOrdinal()
    .domain(["WeightTraining", "Run", "Swim", "Ride"])
    .range(["#f39c12", "#e74c3c", "#3498db", "#2ecc71"]);


export class Time {
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

export function accumulateTable() {
    const table = document.getElementById("myTable");
    const tr = table.querySelector("tbody").getElementsByTagName("tr");
    const headerArr = [...table.getElementsByTagName("th")].map(th => th.innerText);
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

export function onOpenDialog() {
    const reportTargetMonth = document.getElementById("reportTargetMonth");
    if (!reportTargetMonth.value) {
        const today = new Date();
        reportTargetMonth.value = `${today.getFullYear()}-${today.getMonth() + 1}`;
    }
    document.getElementById("reportDialog").showModal();
}

export function onCloseDialog() {
    document.getElementById("reportDialog").close("confirm");
}

export function onDialogClose(rows) {
    if (document.getElementById("reportDialog").returnValue === 'confirm') { // 判斷是否點擊確定
        const selectedValue = document.getElementById('reportTargetMonth').value;
        // selectedValue 格式為 "YYYY-MM" (例如 "2025-02")
        const [year, month] = selectedValue.split('-').map(Number);
        if (year && month) {
            generateChart(year, month - 1, rows); // 月份要 -1
        }
    }
}

export function parseTableToRows(type, table) {
    // 建立所有紀錄的起始/終止時間
    const rows = [];
    const tr = table.querySelector("tbody").querySelectorAll("tr");
    const headerArr = [...table.getElementsByTagName("th")].map(th => th.innerText);
    const nameIndex = headerArr.indexOf("Name");
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
            start, end, type,
            url: tds[nameIndex].querySelector("a")?.href || null,
            name: tds[nameIndex].querySelector("a")?.innerText || null,
        });
    })
    return rows;
}

export function parseDashboardData(type, table, days = 7) {
    const headers = [...table.getElementsByTagName("th")].map(th => th.innerText);
    const dateIdx = headers.indexOf("Date");
    const elapsedIdx = headers.indexOf("Elapsed Time");
    const distIdx = ["Distance", "Distance (km)"].reduce(
        (found, name) => found !== -1 ? found : headers.indexOf(name), -1
    );

    const ago = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const recent = [...table.querySelector("tbody").querySelectorAll("tr")]
        .filter(row => new Date(row.querySelectorAll("td")[dateIdx]?.innerText) >= ago);

    let totalSeconds = 0;
    let totalDist = 0;
    recent.forEach(row => {
        const tds = row.querySelectorAll("td");
        totalSeconds += Time.fromString(tds[elapsedIdx].innerText).toSeconds();
        if (distIdx !== -1) totalDist += parseFloat(tds[distIdx].innerText) || 0;
    });

    return {
        count: recent.length,
        totalTime: Time.fromSeconds(totalSeconds),
        totalDist: distIdx !== -1 ? totalDist : null,
        distUnit: type === "Swim" ? "m" : type === "WeightTraining" ? null : "km",
    };
}

export function parseBestRecords(type, table) {
    const headers = [...table.getElementsByTagName("th")].map(th => th.innerText);
    const nameIdx = headers.indexOf("Name");
    const dateIdx = headers.indexOf("Date");
    const distIdx = ["Distance", "Distance (km)"].reduce(
        (found, name) => found !== -1 ? found : headers.indexOf(name), -1
    );
    const elevIdx = headers.indexOf("Elevation Gain");
    const indoorIdx = headers.indexOf("Indoor") !== -1
        ? headers.indexOf("Indoor") : headers.indexOf("Pool");

    let bestDist = null;
    let bestElev = null;

    [...table.querySelector("tbody").querySelectorAll("tr")].forEach(row => {
        const tds = row.querySelectorAll("td");
        const anchor = tds[nameIdx]?.querySelector("a");
        const url = anchor?.href || null;
        const name = anchor?.innerText || '';
        const date = tds[dateIdx]?.innerText.slice(0, 10) || '';
        const indoor = tds[indoorIdx]?.innerText === 'O';

        if (distIdx !== -1) {
            if (type === 'Ride' && indoor) return;
            const dist = parseFloat(tds[distIdx]?.innerText) || 0;
            if (!bestDist || dist > bestDist.value)
                bestDist = { value: dist, date, url, name };
        }

        if (elevIdx !== -1 && !indoor) {
            const elev = parseFloat(tds[elevIdx]?.innerText) || 0;
            if (!bestElev || elev > bestElev.value)
                bestElev = { value: elev, date, url, name };
        }
    });

    return { bestDist, bestElev };
}

export function generateChart(year, monthIndex, rows) {
    if ( !document.getElementById("chart") ) {
        return;
    }
    const tooltip = document.getElementById("rowTooltip");
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

    // 4. 繪製背景格線 (Grid)
    svg.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(yScale)
            .ticks(d3.timeHour.every(3))
            .tickSize(-width)
            .tickFormat("")
        )
        .selectAll("line") // 選取產生的線
        .attr("stroke", "#ccc") // 下載要看得到，必須用 .attr 或 .style
        .attr("stroke-dasharray", "4,4") // 這裡設定虛線
        .attr("stroke-opacity", 0.7);

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
        .attr("stroke-width", 0.5)
        .style("cursor", "pointer")
        .on("click", (event, d) => {
            window.open(d.url, "_blank");
        })
        .on("mouseover", (event, d) => {
            tooltip.innerText = d.name;
            tooltip.style.display = "block";
        })
        .on("mousemove", (event) => {
            const offset = 15;
            const tipWidth = tooltip.offsetWidth;
            const tipHeight = tooltip.offsetHeight;
            let x = event.clientX + offset;
            let y = event.clientY + offset;
            if (x + tipWidth > window.innerWidth) x = event.clientX - tipWidth - offset;
            if (y + tipHeight > window.innerHeight) y = event.clientY - tipHeight - offset;
            tooltip.style.left = x + "px";
            tooltip.style.top = y + "px";
        })
        .on("mouseout", () => { tooltip.style.display = "none"; });

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
    if (document.getElementById("downloadBtn")) {
        document.getElementById("downloadBtn").disabled = false;
    }
}

export function onDownloadReport() {
    const svgElement = document.querySelector("#chart svg");
    const canvas = document.getElementById("exportCanvas");

    // 1. 取得 SVG 原始碼與尺寸
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgElement);
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    const bbox = svgElement.getBoundingClientRect();
    canvas.width = bbox.width;
    canvas.height = bbox.height;

    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
        // 2. 繪製背景顏色 (選填，如果沒畫背景，透明部分在某些檢視器會變黑色)
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 3. 將圖片畫到 Canvas
        ctx.drawImage(img, 0, 0);

        // 4. 轉換為 PNG 並下載
        const pngUrl = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.href = pngUrl;
        const selectedValue = document.getElementById('reportTargetMonth').value;
        downloadLink.download = `${document.title}_${selectedValue}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        // 釋放記憶體
        URL.revokeObjectURL(url);
    };
    img.src = url;
}

export function aggregateByPeriod(type, table, period) {
    const headers = [...table.getElementsByTagName("th")].map(th => th.innerText);
    const dateIdx = headers.indexOf("Date");
    const elapsedIdx = headers.indexOf("Elapsed Time");
    const distIdx = ["Distance", "Distance (km)"].reduce(
        (found, name) => found !== -1 ? found : headers.indexOf(name), -1
    );

    const now = new Date();
    const buckets = [];

    if (period === "week") {  // 12 weeks
        for (let i = 11; i >= 0; i--) {
            const end = new Date(now - i * 7 * 24 * 60 * 60 * 1000);
            const start = new Date(end - 7 * 24 * 60 * 60 * 1000);
            buckets.push({
                start,
                end,
                label: `${end.getMonth()+1}/${end.getDate()}`,
                value: 0,
                count: 0,
                time: 0,
            });
        }
    } else {  // 12 months
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
            buckets.push({
                start: d,
                end,
                label: `${d.getFullYear()}/${d.getMonth()+1}`,
                value: 0,
                count: 0,
                time: 0,
            });
        }
    }

    const useTime = type === "WeightTraining" || distIdx === -1;

    [...table.querySelector("tbody").querySelectorAll("tr")].forEach(row => {
        const tds = row.querySelectorAll("td");
        const date = new Date(tds[dateIdx]?.innerText);
        const bucket = buckets.find(b => date >= b.start && date < b.end);
        if (!bucket) return;

        bucket.count += 1;
        bucket.time += Time.fromString(tds[elapsedIdx].innerText).toSeconds();
        if (!useTime) {
            bucket.value += parseFloat(tds[distIdx].innerText) || 0;
        } else bucket.value = bucket.time;
    });

    return { buckets, unit: useTime ? "min" : (type === "Swim" ? "m" : "km"), useTime };
}

export function renderTrendChart({ buckets, unit, useTime }) {
    const container = document.getElementById("trend-chart");
    const tooltip = document.getElementById("rowTooltip");
    container.innerHTML = "";

    const margin = { top: 20, right: 20, bottom: 30, left: 50 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = 200 - margin.top - margin.bottom;

    const svg = d3.select("#trend-chart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scalePoint()
        .domain(buckets.map(b => b.label))
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(buckets, b => b.value) * 1.1])
        .range([height, 0]);

    // 面積
    const area = d3.area()
        .x(b => x(b.label))
        .y0(height)
        .y1(b => y(b.value))
        .curve(d3.curveMonotoneX);

    // 折線
    const line = d3.line()
        .x(b => x(b.label))
        .y(b => y(b.value))
        .curve(d3.curveMonotoneX);

    svg.append("path")
        .datum(buckets)
        .attr("fill", `var(--chart-color, #3498db)`)
        .attr("fill-opacity", 0.3)
        .attr("d", area);

    svg.append("path")
        .datum(buckets)
        .attr("fill", "none")
        .attr("stroke", `var(--chart-color, #3498db)`)
        .attr("stroke-width", 2)
        .attr("d", line);

    // 圓點
    svg.selectAll("circle")
        .data(buckets)
        .enter()
        .append("circle")
        .attr("cx", b => x(b.label))
        .attr("cy", b => y(b.value))
        .attr("r", 4)
        .attr("fill", `var(--chart-color, #3498db)`)
        .on("mouseover", (event, b) => {
            let display = useTime
                ? `${Time.fromSeconds(b.value).toString()}`
                : unit === "m" ? `${b.value.toFixed(1)}m` : `${b.value.toFixed(1)}km`;
            display += `<br>${b.count} 次`;
            if (!useTime) display += `<br>${Time.fromSeconds(b.time).toString()}`;
            tooltip.style.display = 'block';
            const start = b.start;
            const end = b.end;
            const label = `${start.getMonth()+1}/${start.getDate()} - ${end.getMonth()+1}/${end.getDate()}`;
            tooltip.innerHTML = `${label}<br>${display}`;
        })
        .on("mousemove", (event) => {
            const offset = 15;
            const tipWidth = tooltip.offsetWidth;
            const tipHeight = tooltip.offsetHeight;

            let x = event.clientX + offset;
            let y = event.clientY + offset;

            if (x + tipWidth > window.innerWidth) x = event.clientX - tipWidth - offset;
            if (y + tipHeight > window.innerHeight) y = event.clientY - tipHeight - offset;
            tooltip.style.left = x + 'px';
            tooltip.style.top = y + 'px';
        })
        .on("mouseout", () => {
            tooltip.style.display = 'none';
        });

    // x 軸（只顯示部分 label 避免擠）
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickValues(
            buckets.filter((_, i) => i % 3 === 0 || i === buckets.length - 1).map(b => b.label)
        ));

    // y 軸
    svg.append("g")
        .call(d3.axisLeft(y).ticks(4).tickFormat(v => {
            if (useTime) return `${Math.round(v / 60)}m`;
            return unit === "m" ? `${v}m` : `${v.toFixed(1)}km`;
        }));
}