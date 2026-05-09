import json
from functools import lru_cache
from pathlib import Path

from . import DATA_DIR


DEFAULT_COMPETITOR_FILE = DATA_DIR / "competitors_by_category.json"


@lru_cache(maxsize=2)
def _load_competitor_data(path):
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def _category_key(category):
    return (category or "").strip().lower()


def _match_category(category, available_keys):
    needle = _category_key(category)
    if not needle:
        return None

    if needle in available_keys:
        return needle

    for key in available_keys:
        if key in needle or needle in key:
            return key

    needle_tokens = {token for token in needle.split() if token}
    for key in available_keys:
        key_tokens = {token for token in key.split() if token}
        if needle_tokens & key_tokens:
            return key

    return None


def lookup_market_competitors(category, limit=5, competitor_file=None):
    data = _load_competitor_data(str(competitor_file or DEFAULT_COMPETITOR_FILE))
    categories = data.get("categories", {})
    available_keys = list(categories.keys())

    matched_key = _match_category(category, available_keys)
    if matched_key is None:
        return list(data.get("default", []))[:limit], None

    return list(categories[matched_key])[:limit], matched_key


def available_categories(competitor_file=None):
    data = _load_competitor_data(str(competitor_file or DEFAULT_COMPETITOR_FILE))
    return sorted(data.get("categories", {}).keys())


def infer_category_from_features(features):
    if not features:
        return ""

    primary = str(features[0]).strip()
    return primary
