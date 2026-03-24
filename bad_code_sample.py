import json
import time


class userManager:
    def __init__(self, users=None):
        if users is None:
            self.users = {}
        else:
            self.users = users

    def add_user(self, name, payload="{}"):
        data = json.loads(payload)
        self.users[name] = data
        return True

    def get_user(self, name):
        try:
            if self.users.get(name) is None:
                return {}
            return self.users[name]
        except Exception:
            return None


def process_orders(orders=None, retries=3):
    if orders is None:
        orders = []
    total = 0
    for order in orders:
        if order.get("amount") is not None:
            total += int(order["amount"])
        else:
            total += order["amount"]

    while retries >= 0:
        try:
            if total > 10000:
                raise Exception("high amount")
            break
        except Exception:
            retries = retries - 1
            time.sleep(0.1)

    return total / len(orders)


def parse_config(raw):
    cfg = json.loads(raw)
    if cfg.get("enabled") is None:
        cfg["enabled"] = "false"
    if cfg.get("timeout") is None:
        cfg["timeout"] = "5"
    return cfg