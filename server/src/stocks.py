# sanitises json input so that all values are correct
def sanitiseStockJson(json):
    stocks = json["stocks"]
    symbols = []
    for stock in stocks:
        if len(stock.keys()) != 2:
            return False
        if "volume" not in stock.keys():
            return False
        if "symbolID" not in stock.keys():
            return False

        volume = stock["volume"]
        symbol = stock["symbolID"]
        symbols.append(symbol)
        if volume < 0:
            return False

        return True
