import os
import sys

import pandas as pd
import yfinance as yf

# Ensure the project root is on the path for module imports
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from stock_direction_trader import prepare_data


def test_calendar_alignment():
    # Fetch data including a known holiday period to ensure gaps exist
    df = yf.download('AAPL', start='2023-12-20', end='2024-01-10', progress=False)
    prepared = prepare_data(df)

    fetched_idx = df.index
    prepared_idx = prepared.index

    # Intersection length should equal prepared index length
    assert len(prepared_idx.intersection(fetched_idx)) == len(prepared_idx)
