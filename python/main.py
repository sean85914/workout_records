import os
from glob import glob
from zoneinfo import ZoneInfo
from datetime import datetime
from crawl_data import (connect, collect_activities, save_data, load_data, to_html,
                        fix_swim_distance)

client, _ = connect(
    client_id=os.environ["STRAVA_CLIENT_ID"],
    client_secret=os.environ["STRAVA_CLIENT_SECRET"],
    refresh_token=os.environ["STRAVA_REFRESH_TOKEN"],
)

datas = []
for pkl in glob('data/*.pkl'):
    datas.append(load_data(pkl))
print([len(data['datas']) for data in datas])

y = datas[0]['meta']['date'].year
m = datas[0]['meta']['date'].month
d = datas[0]['meta']['date'].day

datas = collect_activities(
    client,
    datas,
    after=datetime(y, m, d, tzinfo=ZoneInfo("Asia/Taipei"))
)

fix_activities = os.environ.get("FIX_ACTIVITIES", "")

if fix_activities:
    index = next(i for i, r in enumerate(glob('data/*.pkl')) if r.find('swim') != -1)
    for item in fix_activities.split(","):
        activity_id, distance = item.strip().split(":")
        fix_swim_distance(datas[index], int(activity_id), float(distance))


for data in datas:
    save_data(data['datas'], data['meta']['type'])
    to_html(data)

for _type in ['WeightTraining', 'Swim', 'Ride', 'Run']:
    os.rename(f'{_type}.html', f'../{_type}.html')

for file in glob('*.pkl'):
    os.rename(file, f'data/{file}')

print([len(data['datas']) for data in datas])
