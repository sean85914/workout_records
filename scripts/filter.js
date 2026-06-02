import { accumulateTable } from "./utils.js";
import noUiSlider from "nouislider";


document.getElementById("toggleFilter").addEventListener("click", () => {
    const panel = document.getElementById("filter-panel");
    const btn = document.getElementById("toggleFilter");
    const isOpen = panel.style.display !== "none";
    panel.style.display = isOpen ? "none" : "block";
    btn.textContent = isOpen ? "▼ 篩選" : "▲ 篩選";
    const distSlider = document.getElementById("dist-slider");
    if (distSlider) {
        const distIndex = Array.from(document.querySelectorAll('#myTable thead th'))
            .findIndex(th => th.innerText.includes('Distance'));
        const unit = document.querySelectorAll('#myTable thead th')[distIndex].innerText.includes('km')
            ? "km" : "m";
        const distArray = Array.from(document.querySelectorAll('#myTable tbody tr'))
            .map(tr => Number(tr.querySelectorAll('td')[distIndex].innerText));
        const distMax = Math.ceil(Math.max(...distArray));
        noUiSlider.create(distSlider, {
            start: [0, distMax],  // 初始值
            connect: true,  // 兩個 thumb 之間填色
            range: { min: 0, max: distMax },
            step: 1,
        });
        document.getElementById("dist-range-label").textContent = `0 ~ ${distMax} ${unit}`;
        distSlider.noUiSlider.on("update", (values) => {
            const [min, max] = values.map(Number);
            document.getElementById("dist-range-label").textContent = `${min} ~ ${max} ${unit}`;
            filterTable();
        });
    }

    const elevSlider = document.getElementById("elev-slider");
    if (elevSlider) {
        const elevIndex = Array.from(document.querySelectorAll('#myTable thead th'))
            .findIndex(th => th.innerText.includes('Elevation Gain'));
        const elevArray = Array.from(document.querySelectorAll('#myTable tbody tr'))
            .map(tr => Number(tr.querySelectorAll('td')[elevIndex].innerText) || 0);
        const elevMax = Math.ceil(Math.max(...elevArray));
        noUiSlider.create(elevSlider, {
            start: [0, elevMax],
            connect: true,
            range: { min: 0, max: elevMax },
            step: 1,
        });
        document.getElementById("elev-range-label").textContent = `0 ~ ${elevMax} m`;
        elevSlider.noUiSlider.on("update", (values) => {
            const [min, max] = values.map(Number);
            document.getElementById("elev-range-label").textContent = `${min} ~ ${max} m`;
            filterTable();
        });
    }
});

document.querySelectorAll('#location-toggle button').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('#location-toggle button').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        filterTable();
    })
})

document.getElementById('keyword').addEventListener('change', filterTable);

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

export function resetFilter() {
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    const distSlider = document.getElementById('dist-slider');
    const elevSlider = document.getElementById('elev-slider');
    if (distSlider?.noUiSlider) {
        distSlider.noUiSlider.reset();
    }
    if (elevSlider?.noUiSlider) {
        elevSlider.noUiSlider.reset();
    }
    document.querySelector('.location-btn[data-value="全部"]')?.click();
    document.getElementById('keyword').value = '';
    filterTable();
}

export function filterTable() {
    // 獲取選擇的日期數值
    const startDateInput = document.getElementById('startDate').value;
    const endDateInput = document.getElementById('endDate').value;
    const table = document.getElementById("myTable");
    const headerArr = [...table.getElementsByTagName("th")].map(th => th.innerText);
    const tr = table.querySelector("tbody").getElementsByTagName("tr");
    const nameColumnIndex = headerArr.indexOf("Name");
    const dateColumnIndex = headerArr.indexOf("Date");
    const distColumnIndex = headerArr.findIndex(header => header.includes('Distance'));
    const elevColumnIndex = headerArr.findIndex(header => header.includes('Elevation Gain'));
    let indoorColumnIndex = -1;
    if (document.title.includes('游泳')) {
        indoorColumnIndex = headerArr.findIndex(header => header.includes('Pool'));
    } else if (document.title.includes('跑步') || document.title.includes('騎行')) {
        indoorColumnIndex = headerArr.findIndex(header => header.includes('Indoor'));
    }

    // 獲取選擇的距離及爬升數值
    const distSlider = document.getElementById('dist-slider');
    const [minDist, maxDist] =
        distSlider?.noUiSlider
        ? distSlider.noUiSlider.get().map(Number)
        : [0, Infinity];
    const elevSlider = document.getElementById('elev-slider');
    const [minElev, maxElev] =
        elevSlider?.noUiSlider
        ? elevSlider.noUiSlider.get().map(Number)
        : [0, Infinity];
    const location = document.querySelector('#location-toggle button.active')?.dataset.value || '全部';
    const keyword = document.getElementById('keyword').value.toLowerCase() || '';


    // 將輸入轉為 Date 物件（若無輸入則設為極值)
    const start = startDateInput ? new Date(startDateInput.replace(/-/g, '/')) : null;
    const end = endDateInput ? new Date(endDateInput.replace(/-/g, '/')) : null;

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
            // 距離
            if (distColumnIndex !== -1) {
                const dist = Number(tr[i].getElementsByTagName("td")[distColumnIndex].innerText) || 0;
                if (dist < minDist || dist > maxDist) {
                    showRow = false;
                }
            }
            // 爬升
            if (elevColumnIndex !== -1) {
                const elev = Number(tr[i].getElementsByTagName("td")[elevColumnIndex].innerText) || 0;
                if (elev < minElev || elev > maxElev) {
                    showRow = false;
                }
            }
            // 室內
            if (indoorColumnIndex !== -1) {
                const indoor = tr[i].getElementsByTagName("td")[indoorColumnIndex].innerText === 'O';
                if ((['游泳池', '訓練台', '跑步機'].includes(location) && !indoor) ||
                    (location === '戶外' && indoor)) {
                    showRow = false;
                }
            }
            // 名稱
            if (keyword &&
                    !tr[i].getElementsByTagName("td")[nameColumnIndex].innerText.toLowerCase().includes(keyword)) {
                showRow = false;
            }
            // 執行隱藏或顯示
            tr[i].style.display = showRow ? "" : "none";
        }
    }
    accumulateTable();
    syncToURL();
}


function syncToURL() {
    const params = new URLSearchParams();
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const keyword = document.getElementById('keyword').value;
    const location = document.querySelector('#location-toggle button.active')?.dataset.value;
    const distSlider = document.getElementById('dist-slider');
    const elevSlider = document.getElementById('elev-slider');

    if (startDate) params.set('start', startDate);
    if (endDate) params.set('end', endDate);
    if (keyword) params.set('q', keyword);
    if (location && location !== '全部') params.set('loc', location);
    if (distSlider?.noUiSlider) {
        const [min, max] = distSlider.noUiSlider.get().map(Number);
        if (min > 0) params.set('distMin', min);
        if (max < distSlider.noUiSlider.options.range.max) params.set('distMax', max);
    }
    if (elevSlider?.noUiSlider) {
        const [min, max] = elevSlider.noUiSlider.get().map(Number);
        if (min > 0) params.set('elevMin', min);
        if (max < elevSlider.noUiSlider.options.range.max) params.set('elevMax', max);
    }

    const newURL = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', newURL);
}

function restoreFromURL() {
    const params = new URLSearchParams(window.location.search);
    const keys = ['start', 'end', 'q', 'loc', 'distMin', 'distMax', 'elevMin', 'elevMax'];
    const hasFilter = keys.some(key => params.has(key));
    if (hasFilter) {
        // 展開過濾畫面
        document.getElementById('toggleFilter').click();
    }
    if (params.get('start')) {
        document.getElementById('startDate').value = params.get('start');
    }
    if (params.get('end')) {
        document.getElementById('endDate').value = params.get('end');
    }
    if (params.get('q')) {
        document.getElementById('keyword').value = params.get('q');
    }
    if (params.get('loc')) {
        document.querySelector(`#location-toggle [data-value="${params.get('loc')}"]`)?.click();
    }

    const distSlider = document.getElementById('dist-slider');
    if (distSlider?.noUiSlider && (params.has('distMin') || params.has('distMax'))) {
        const [curMin, curMax] = distSlider.noUiSlider.get().map(Number);
        distSlider.noUiSlider.set([
            params.has('distMin') ? Number(params.get('distMin')) : curMin,
            params.has('distMax') ? Number(params.get('distMax')) : curMax,
        ]);
    }

    const elevSlider = document.getElementById('elev-slider');
    if (elevSlider?.noUiSlider && (params.has('elevMin') || params.has('elevMax'))) {
        const [curMin, curMax] = elevSlider.noUiSlider.get().map(Number);
        elevSlider.noUiSlider.set([
            params.has('elevMin') ? Number(params.get('elevMin')) : curMin,
            params.has('elevMax') ? Number(params.get('elevMax')) : curMax,
        ]);
    }

    if (hasFilter) filterTable();
}

restoreFromURL();