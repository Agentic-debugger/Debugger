import json
import os

API_KEY = os.getenv("API_KEY")

cache = {}


def bad_function(items=None, config=None, cache=None):
    # global cache # Removed as cache is now passed as an argument

    try:
        if items is None:
            items = []

        if config is None:
            config = {}

        if cache is None:
            raise ValueError("A cache dictionary must be provided.")

        with open("tmp_data.txt", "w") as data:
            data.write("seed")

        print('executed dynamic code')

        cache["last"] = items
        return len(items) + len(config)
    except Exception:
        return 0


def another_issue(token=os.getenv("AUTH_TOKEN")):
    if token is not None:
        return json.loads("{\"ok\": true}")
    return {}