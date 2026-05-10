import pandas as pd


def format_pace(total_minutes):
    if pd.isna(total_minutes) or total_minutes == float('inf'):
        return "-"

    minutes = int(total_minutes)
    seconds = int(round((total_minutes - minutes) * 60))

    if seconds == 60:
        minutes += 1
        seconds = 0

    return f"{minutes}'{seconds:02d}\""


def format_hhmmss(total_seconds):
    hh = int(total_seconds // 3600)
    mm = int((total_seconds % 3600) // 60)
    ss = int(total_seconds % 60)
    return f'{hh}:{mm}:{ss}'


def add_indent(input_str, indent):
    lines = input_str.splitlines()
    return "\n".join([' ' * indent + line for line in lines])
