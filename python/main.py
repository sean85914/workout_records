import os
from glob import glob
from zoneinfo import ZoneInfo
from datetime import datetime
from crawl_data import connect, collect_activities, save_data, load_data, to_html

client = connect(
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

for data in datas:
    save_data(data['datas'], data['meta']['type'])
    to_html(data)

for _type in ['WeightTraining', 'Swim', 'Ride', 'Run']:
    os.rename(f'{_type}.html', f'../{_type}.html')

print([len(data['datas']) for data in datas])
