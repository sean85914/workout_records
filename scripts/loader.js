import { state } from "./state.js";
// 運動類型顯示成中文
const TYPE_MAP = {
    Yoga: "瑜伽",
    Hike: "健行",
    Elliptical: "橢圓機",
    Rowing: "划船",
};

function cellText(value) {
    // null / undefined 顯示空字串，其餘轉字串
    return value === null || value === undefined ? "" : String(value);
}

// 距離：去掉 "meter" 單位；0（如瑜伽）留空不顯示。
function normalizeDistance(value) {
    if (value === null || value === undefined || value === "") return "";
    const num = parseFloat(value);
    if (Number.isNaN(num) || num === 0) return "";
    return String(num);
}

function buildRow(record, columns) {
    const tr = document.createElement("tr");
    columns.forEach(column => {
        const td = document.createElement("td");
        let value = record[column];
        if (column === "Distance") {
            value = normalizeDistance(value);
        } else if (column === "Type") {
            value = TYPE_MAP[value] ?? value;
        } else if (column === "Date") {
            // 2026-09-19T15:14:48.000 -> 2026-09-19 15:14:48
            value = value.replace("T", " ").slice(0, value.length - 4);
        }
        if (column === "Name") {
            // 讓Name變成href，直接連到該活動的Strava紀錄
            const id = record.ID;
            if (id !== null && id !== undefined && id !== "") {
                const a = document.createElement("a");
                a.href = `https://www.strava.com/activities/${id}`;
                a.target = "_blank";
                a.rel = "noopener";
                a.textContent = cellText(value);
                td.appendChild(a);
            } else {
                td.textContent = cellText(value);
            }
        } else {
            td.textContent = cellText(value);
        }
        tr.appendChild(td);
    });
    return tr;
}

export async function main(dataUrl) {
    const tbody = document.querySelector("#myTable tbody");
    let columns = [];
    try {
        const resp = await fetch(dataUrl, { cache: "no-cache" });
        if (!resp.ok) {
            throw new Error(`HTTP ${resp.status}`);
        }
        const records = await resp.json();
        state.records = records;
        columns = records.length ? Object.keys(records[0]) : [];

        // 塞進去前先依 Date 升冪排序。
        records.sort((a, b) => new Date(a.Date) - new Date(b.Date));

        const frag = document.createDocumentFragment();
        for (const record of records) {
            frag.appendChild(buildRow(record, columns));
        }
        tbody.appendChild(frag);
    } catch (err) {
        console.error("載入 資料失敗：", err);
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = columns.length;
        td.textContent = `載入資料失敗：${err.message}`;
        tr.appendChild(td);
        tbody.appendChild(tr);
        return;  // 資料沒進來就不初始化篩選/報表
    }

    // 表格填好後才載入這兩支：它們在 import 時就會同步讀取 #myTable。
    await import("./filter.js");
    await import("./script.js");
}
