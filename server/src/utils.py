import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import logging

logging.basicConfig(level=logging.INFO)

def load_csv(file_path):
    return pd.read_csv(file_path)

def parse_date(date_str):
    return pd.to_datetime(date_str)

def clean_data(df):
    return df.dropna()

def calculate_moving_average(df, column, window):
    return df[column].rolling(window=window).mean()

def mean(values):
    return np.mean(values)

def standard_deviation(values):
    return np.std(values)

def get_date_range(start_date, end_date):
    start = datetime.strptime(start_date, '%Y-%m-%d')
    end = datetime.strptime(end_date, '%Y-%m-%d')
    return [start + timedelta(days=x) for x in range((end-start).days + 1)]

def log_error(message):
    logging.error(message)

def log_info(message):
    logging.info(message)