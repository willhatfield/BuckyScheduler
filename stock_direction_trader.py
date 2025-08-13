import pandas as pd


def prepare_data(df: pd.DataFrame) -> pd.DataFrame:
    """Prepare stock data without imposing a generic business day calendar.

    Parameters
    ----------
    df : pd.DataFrame
        Raw price data with a DateTimeIndex as provided by the data source
        (e.g., yfinance).

    Returns
    -------
    pd.DataFrame
        DataFrame with additional features computed using the original
        DateTimeIndex from the source. No reindexing is performed.
    """
    # Work on a copy to avoid mutating caller's DataFrame
    data = df.copy()

    # Example feature: daily returns
    if 'Close' in data.columns:
        data['Return'] = data['Close'].pct_change()

    # Drop initial NA from pct_change or any missing values
    data.dropna(inplace=True)

    return data
