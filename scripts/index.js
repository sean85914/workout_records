import { parseTableToRows, onOpenDialog, onCloseDialog, onDialogClose,
         onDownloadReport, parseDashboardData, renderTrendChart,
         aggregateByPeriod, parseBestRecords } from "./utils.js";


const config = {
    Swim:           { label: "游泳", emoji: "🏊", color: "#3498db" },
    Ride:           { label: "單車", emoji: "🚴", color: "#2ecc71" },
    Run:            { label: "跑步", emoji: "🏃", color: "#e74c3c" },
    WeightTraining: { label: "重訓", emoji: "🏋", color: "#f39c12" },
};


function renderDashboard(allStats) {
    const dashboard = document.getElementById("dashboard");
    for (const [type, data] of Object.entries(allStats)) {
        const { label, emoji, color } = config[type];
        const t = data.totalTime;
        const timeStr = t.h > 0 ? `${t.h}h ${t.m}m` : `${t.m}m`;
        const distStr = data.totalDist !== null
            ? (type === "Swim" ? `${Math.round(data.totalDist)}m` : `${data.totalDist.toFixed(1)}km`)
            : "—";
        dashboard.insertAdjacentHTML("beforeend", `
            <div class="dashboard-card" style="--card-color: ${color}">
                <div class="card-title">
                    ${emoji}<a href="${type}.html"> ${label}</a>
                </div>
                <div class="card-count">${data.count} 次</div>
                <div class="card-time">${data.count > 0 ? timeStr : "—"}</div>
                <div class="card-dist">${data.count > 0 ? distStr : "—"}</div>
            </div>
        `);
    }
}

function renderBestRecords(allBest) {
    const container = document.getElementById("best-records");
    const items = [
        { emoji: "🏊", label: "游泳最長",   data: allBest.Swim?.bestDist, fmt: v => `${Math.round(v)}m` },
        { emoji: "🚴", label: "騎行最長",   data: allBest.Ride?.bestDist, fmt: v => `${v.toFixed(1)}km` },
        { emoji: "🏃", label: "跑步最長",   data: allBest.Run?.bestDist,  fmt: v => `${v.toFixed(1)}km` },
        { emoji: "🚴", label: "騎行最大爬升", data: allBest.Ride?.bestElev, fmt: v => `${Math.round(v)}m` },
        { emoji: "🏃", label: "跑步最大爬升", data: allBest.Run?.bestElev,  fmt: v => `${Math.round(v)}m` },
    ];

    items.forEach(({ emoji, label, data, fmt }) => {
        if (!data) return;
        container.insertAdjacentHTML("beforeend", `
            <div class="best-record-row">
                <span class="best-label">${emoji} ${label}</span>
                <a href="${data.url}" target="_blank" class="best-value">${fmt(data.value)}</a>
                <span class="best-date">${data.date}</span>
            </div>
        `);
    });
}

function updateChart() {
    const table = cachedTables[trend.type];
    const data = aggregateByPeriod(trend.type, table, trend.period);
    const color = config[trend.type].color;
    document.getElementById("trend-chart").style.setProperty("--chart-color", color);
    renderTrendChart(data);
}


const dialog = document.getElementById('reportDialog');
const openBtn = document.getElementById('openReportBtn');
const cancelBtn = document.getElementById('cancelBtn');
const downloadBtn = document.getElementById("downloadBtn");

const rows = [];
const cachedTables = {};
const dashboardStats = {};
const allBest = {};
const types = ["Swim", "Ride", "Run", "WeightTraining"];
for (const type of types) {
    const res = await fetch(`${type}.html`);
    const text = await res.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "text/html");
    const table = doc.getElementById("myTable");
    cachedTables[type] = table;
    const _rows = parseTableToRows(type, table);
    rows.push(..._rows);
    dashboardStats[type] = parseDashboardData(type, table);
    allBest[type] = parseBestRecords(type, table);
}

renderDashboard(dashboardStats);
renderBestRecords(allBest);

let trend = {
    type: document.querySelector(".type-btn.active").dataset.type,
    period: document.querySelector(".period-btn.active").dataset.period,
};

updateChart();

openBtn.addEventListener("click", onOpenDialog);
cancelBtn.addEventListener('click', onCloseDialog);
dialog.addEventListener('close', () => {
    onDialogClose(rows);
});
document.getElementById('confirmBtn').addEventListener('click', (e) => {
    dialog.close('confirm');
});
downloadBtn.addEventListener("click", onDownloadReport);
document.querySelectorAll(".toggle-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
        document.querySelector(".toggle-btn.active").classList.remove("active");
        e.target.classList.add("active");

        document.getElementById('recentDays').innerHTML = e.target.dataset.range;
        const days = parseInt(e.target.dataset.range);
        const newStats = {};
        for (const [type, table] of Object.entries(cachedTables)) {
            newStats[type] = parseDashboardData(type, table, days);
        }
        document.getElementById("dashboard").innerHTML = "";
        renderDashboard(newStats);
    });
});


document.querySelectorAll(".type-btn").forEach(btn => {
    btn.addEventListener("click", e => {
        document.querySelector(".type-btn.active").classList.remove("active");
        e.target.classList.add("active");
        trend.type = e.target.dataset.type;
        updateChart();
    });
});

document.querySelectorAll(".period-btn").forEach(btn => {
    btn.addEventListener("click", e => {
        document.querySelector(".period-btn.active").classList.remove("active");
        e.target.classList.add("active");
        trend.period = e.target.dataset.period;
        document.getElementById('trend-period').innerText = ` ${e.target.innerText}`;
        updateChart();
    });
});

const tooltip = document.getElementById("rowTooltip");