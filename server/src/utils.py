import pandas as pd
import numpy as np
import logging

logging.basicConfig(level=logging.INFO)

def load_csv(file_path):
    return pd.read_csv(file_path)

def parse_date(date_str):
    return pd.to_datetime(date_str)

def clean_data(df):
    return df.dropna()

def mean(values):
    return np.mean(values)

def standard_deviation(values):
    return np.std(values)

def log_error(message):
    logging.error(message)

def log_info(message):
    logging.info(message)
    