import json
from src.stocks import sanitiseStockJson

def test_sanitisejson():
    assert sanitiseStockJson(json.loads('{"stocks": [{"volume": 69,"symbolID": 0}]}'))

def test_sanitisejson_negativevol():
    assert not sanitiseStockJson(json.loads('{"stocks": [{"volume": -69,"symbolID": 0}]}'))

def test_sanitisejson_badfields():
    assert not sanitiseStockJson(json.loads('{"stocks": [{"symbolID": 0}]}'))
    assert not sanitiseStockJson(json.loads('{"stocks": [{"volume": 0}]}'))
    assert not sanitiseStockJson(json.loads('{"stocks": [{"bad": 3, "volume": -69,"symbolID": 0}]}'))
    