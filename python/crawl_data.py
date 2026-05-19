from datetime import datetime
import pandas as pd
from stravalib.client import Client
import pickle
from utils import format_pace, format_hhmmss, add_indent


ATTRS_MAPPING = {
    "ID": "id",
    "Name": "name",
    "Date": "start_date_local",
    "Elapsed Time": "elapsed_time",
    "Calories": "calories",
    "Max HR": "max_heartrate",
    "Mean HR": "average_heartrate",
    "Description": "description",
    "Pool": "trainer",
    "Indoor": "trainer",
    "Moving Time": "moving_time",
    "Mean Speed": "average_speed",
    "Mean Cadence": "average_cadence",
    "Distance": "distance",
    "Elevation Gain": "total_elevation_gain",
}

WORKOUT_COLUMNS = [
    "ID", "Name", "Date", "Elapsed Time", "Calories", "Max HR", "Mean HR", "Description"
]
SWIM_COLUMNS = [
    "ID", "Name", "Date", "Pool", "Elapsed Time", "Moving Time",
    "Calories", "Max HR", "Mean HR", "Mean Speed", "Distance",
]
RIDE_COLUMNS = [
    "ID", "Name", "Date", "Indoor", "Elapsed Time", "Moving Time",
    "Calories", "Max HR", "Mean HR", "Mean Speed", "Mean Cadence", "Distance",
    "Elevation Gain"
]
RUN_COLUMNS = [
    "ID", "Name", "Date", "Indoor", "Elapsed Time", "Moving Time",
    "Calories", "Max HR", "Mean HR", "Mean Speed", "Mean Cadence", "Distance",
    "Elevation Gain"
]

HTML_TEMPLATE = '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>%s紀錄</title>
    <link rel="stylesheet" href="style.css">
    <script type="importmap">
    {
      "imports": {
        "d3": "https://cdn.jsdelivr.net/npm/d3@7/+esm"
      }
    }
    </script>
</head>
<body>
    <div class="filter-container" style="margin-bottom: 20px;">
        <label for="startDate">起始日期：</label>
        <input type="date" id="startDate">
        <label for="endDate" style="margin-left: 20px;">結束日期：</label>
        <input type="date" id="endDate">
        <button id="reset">重設</button>
    </div>
    <a href="./index.html">回到首頁</a>
%s
    <button id="backToTop" title="回到頂部">▲</button>
    <div id="rowTooltip"></div>
    <div class="actions">
        <button id="openReportBtn">生成報表</button>
        <button id="downloadBtn" disabled="true">下載報表</button>
    </div>
    <dialog id="reportDialog">
        <form method="dialog">
            <h3>選擇報表月份</h3>
            <label>
                年份與月份:
                <input type="month" id="reportTargetMonth">
            </label>
            <div style="margin-top: 15px;">
                <button type="button" id="cancelBtn">取消</button>
                <button type="submit" id="confirmBtn">確定</button>
            </div>
        </form>
    </dialog>
    <div id="chart" class="chart-container"></div>
    <canvas id="exportCanvas"></canvas>
    <script type="module" src="./scripts/script.js"></script>
</body>'''


def save_data(data, work_type):
    with open(f'{work_type}.pkl', 'wb') as f:
        pickle.dump({
            'meta': {
                'date': datetime.now(),
                'num': len(data),
                'type': work_type,
            },
            'datas': data if isinstance(data, list) else data['datas']
        }, f)


def load_data(file):
    with open(file, 'rb') as f:
        data = pickle.load(f)
    return data


def connect(client_id, client_secret, session=None, refresh_token=None):
    client = Client()
    if not refresh_token:
        url = client.authorization_url(
            client_id=client_id,
            redirect_uri="http://127.0.0.1:5000/authorization",
        )
        print(url)
        token_response = client.exchange_code_for_token(
            client_id=client_id,
            client_secret=client_secret,
            code=input("code: ")
        )
        print(f"Token expired at: {datetime.fromtimestamp(token_response['expires_at'])}")
        access_token = token_response["access_token"]
        refresh_token = token_response["refresh_token"]
        client = Client(access_token=access_token, requests_session=session)
    else:
        token_response = client.refresh_access_token(
            client_id=client_id,
            client_secret=client_secret,
            refresh_token=refresh_token
        )
        client = Client(access_token=token_response["access_token"])
    return client, refresh_token


def collect_activities(client, datas, before=None, after=None):
    work_types = [data['meta']['type'] for data in datas]
    work_types = [
        ''.join(part.capitalize() for part in wt.split('_'))
        for wt in work_types
    ]

    activities = client.get_activities(before=before, after=after)
    sets = [set([d[0] for d in data['datas']]) for data in datas]
    for act in activities:
        if act.type not in work_types:
            print(f'Ignore {act.name} ({act.start_date_local})')
            continue
        index = work_types.index(act.type)
        if act.id in sets[index]:
            print(f'{act.name} already existed, ignore')
            continue
        if hasattr(client.protocol.rate_limiter.rules[0], 'rates'):
            rates = client.protocol.rate_limiter.rules[0].rates
            should_stop = False
            if rates.short_usage >= rates.short_limit - 1:
                print("Out of short limits, please wait 15 minutes")
                should_stop = True
            if rates.long_usage >= rates.long_limit - 1:
                print("Out of long limits, please wait tomorrow")
                should_stop = True
            if should_stop:
                break
        act_detail = client.get_activity(act.id)

        if act.type == 'WeightTraining':
            data = [getattr(act_detail, ATTRS_MAPPING[k]) for k in WORKOUT_COLUMNS]
        elif act.type == 'Swim':
            data = [getattr(act_detail, ATTRS_MAPPING[k]) for k in SWIM_COLUMNS]
        elif act.type == 'Ride':
            data = [getattr(act_detail, ATTRS_MAPPING[k]) for k in RIDE_COLUMNS]
        elif act.type == 'Run':
            data = [getattr(act_detail, ATTRS_MAPPING[k]) for k in RUN_COLUMNS]
        else:
            assert False, act.type
        datas[index]['datas'].append(data)
        sets[index].add(data[0])
        print(f'Add {act.name} ({act.start_date_local})')
    return datas


def form_df(data, add_summarize_line=False):
    work_type = data['meta']['type'].replace('_', ' ').title().replace(' ', '')
    if work_type == 'WeightTraining':
        col = WORKOUT_COLUMNS
    elif work_type == 'Swim':
        col = SWIM_COLUMNS
    elif work_type == 'Ride':
        col = RIDE_COLUMNS
    elif work_type == 'Run':
        col = RUN_COLUMNS
    else:
        assert False, f"Unsupported type: {work_type}"
    df = pd.DataFrame(data['datas'], columns=col)
    df.sort_values(by="Date", inplace=True)
    df['Elapsed Time'] = df['Elapsed Time'].astype(str).str.replace('0 days ', '')
    df['Name'] = df.apply(
        lambda row: f'<a href="https://www.strava.com/activities/{row["ID"]}" target="_blank">{row["Name"]}</a>',
        axis=1
    )
    if 'Moving Time' in col:
        df['Moving Time'] = df['Moving Time'].astype(str).str.replace('0 days ', '')
        moving_time = df['Moving Time'].apply(lambda f: pd.Timedelta(f).total_seconds())
        elapsed_time = df['Elapsed Time'].apply(lambda f: pd.Timedelta(f).total_seconds())
        df['Moving Percentage'] = round(moving_time / elapsed_time * 100, 2)
    if work_type in ['Run', 'Ride']:
        df['Distance'] = df['Distance'].astype(str) \
            .str.replace(r'[^0-9.]', '', regex=True).astype(float) / 1000  # convert to km
        df['Mean Cadence'] *= 2
        df['Elevation Gain'] = df['Elevation Gain'].astype(str) \
            .str.replace(r'[^0-9.]', '', regex=True).astype(float)
        df['Elevation Gain'][df['Indoor']] = '--'
        df['Mean Speed'] = df['Mean Speed'].astype(str) \
            .str.replace(r'[^0-9.]', '', regex=True).astype(float) / 1000 * 3600  # m/s -> km/h
        if work_type == 'Run':
            df['Mean Pace'] = (1 / df['Mean Speed'] * 60).apply(format_pace)  # min/km
        # rename Distance to Distance (km)
        columns = list(df.columns)
        columns[columns.index("Distance")] = "Distance (km)"
        df.columns = columns
    if work_type != 'WeightTraining':
        key = 'Indoor' if work_type in ['Run', 'Ride'] else 'Pool'
        df[key] = df[key].apply(lambda f: 'O' if f else 'X')
    if work_type == 'Swim':
        df['Distance'] = df['Distance'].astype(str) \
            .str.replace(r'[^0-9.]', '', regex=True).astype(float)
        df['Mean Speed'] = df['Mean Speed'].astype(str) \
            .str.replace(r'[^0-9.]', '', regex=True)
        df['Mean Pace (100m)'] = 1 / df['Mean Speed'].astype(float) * 100 / 60
        df['Mean Pace (100m)'] = df['Mean Pace (100m)'].apply(format_pace)
    if 'Description' in col:
        df['Description'] = df['Description'].str.replace('\n', '<br>').replace('\\r', '')

    # Add Summarize line
    if add_summarize_line:
        num = len(df)
        df.loc[num] = None
        df.loc[num, 'Name'] = 'Summarize'
        if work_type in ['Run', 'Ride']:
            df.loc[num, 'Elevation Gain'] = df['Elevation Gain'] \
                .apply(lambda f: 0 if not isinstance(f, float) else f).sum()
            df.loc[num, 'Distance (km)'] = df['Distance (km)'].sum()
        total_seconds = df['Moving Time'].apply(pd.Timedelta).sum().total_seconds()
        df.loc[num, 'Moving Time'] = format_hhmmss(total_seconds)
        df.loc[num, 'Calories'] = df['Calories'].sum()

    return df


def to_html(data):
    df = form_df(data)
    work_type = data['meta']['type'].replace('_', ' ').title().replace(' ', '')
    if work_type == 'WeightTraining':
        work_type_zh = '重量訓練'
    elif work_type == 'Swim':
        work_type_zh = '游泳'
    elif work_type == 'Ride':
        work_type_zh = '騎行'
    elif work_type == 'Run':
        work_type_zh = '跑步'
    else:
        assert False, f"Unsupported type: {work_type}"
    table_str = df.to_html(index=False, escape=False, na_rep='', table_id='myTable')
    table_str = table_str.replace('\\r', '')
    html = HTML_TEMPLATE % (work_type_zh, add_indent(table_str, 4))
    with open(f'{work_type}.html', 'w') as f:
        f.write(html)
    return f.name


def fix_swim_distance(swim_datas, target_id, correct_distance):
    if swim_datas['meta']['type'] != 'swim':
        raise ValueError('Input data is not with type swim')
    row = next(row for row in swim_datas['datas'] if row[0] == target_id)
    from pint import UnitRegistry
    unit_reg = UnitRegistry()
    distance_idx = SWIM_COLUMNS.index('Distance')
    moving_time_idx = SWIM_COLUMNS.index('Moving Time')
    mean_speed_idx = SWIM_COLUMNS.index('Mean Speed')
    row[distance_idx] = correct_distance * unit_reg.meter
    duration = row[moving_time_idx].total_seconds()
    row[mean_speed_idx] = round(correct_distance / duration, 3) * (unit_reg.meter / unit_reg.second)


def remove_activities(datas, ids):
    ids_set = set(ids)
    for data in datas:
        data['datas'][:] = [row for row in data['datas'] if row[0] not in ids_set]
