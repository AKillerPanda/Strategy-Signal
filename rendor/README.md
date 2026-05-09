# Rendor Mobile Bundle

This folder is a portable backend bundle copied from the main project for mobile-app work.

It now also includes a small FastAPI wrapper in `api.py` so a Newly mobile app can call this bundle as an external backend.

It includes the core Python strategy engine files:

- `api.py`
- `dataset_loader.py`
- `evaluator.py`
- `game_theory.py`
- `gametheory.py`
- `graph_model.py`
- `market_data.py`
- `predictive_models.py`
- `reinforcement_model.py`
- `rlagent.py`
- `strategy_signal_rl.py`

It also includes the copied data and checkpoint artifacts needed for a mobile demo flow:

- `data/competitors_by_category.json`
- `models/heuristic_checkpoint.json`
- `models/strategysignal_rl_policy.json`
- `models/strategysignal_predictive.joblib`
- `models/scenario_snapshot.json`

The copied `scenario_snapshot.json` has already been rewritten to use the local `rendor/models` paths.

Use this bundle when you want a mobile app backend without the Streamlit UI. The Streamlit-specific files were intentionally left out:

- `app.py`
- `streamlit_app.py`
- `.streamlit/`
- `assets/`

Typical mobile-backend entry points:

- `api.py` for HTTP endpoints that a React Native / Newly app can call
- `load_scenario_from_checkpoints()` from `dataset_loader.py` for fast saved-checkpoint demos
- `evaluate_strategy()` from `evaluator.py` for manual strategy input flows

Install dependencies from this folder with:

```bash
pip install -r requirements.txt
```

Optional environment variables:

- `STRATEGYSIGNAL_API_KEY` enables `x-api-key` protection on `POST /evaluate` and `GET /saved-scenario`
- `STRATEGYSIGNAL_CORS_ORIGINS` accepts `*` or a comma-separated origin list such as `https://your-newly-app.example,http://localhost:3000`

You can copy `.env.example` and set values before deployment.

Run the API locally with:

```bash
uvicorn api:app --reload
```

Useful endpoints:

- `GET /`
- `GET /health`
- `POST /evaluate`
- `GET /saved-scenario`

Example local health check:

```text
http://127.0.0.1:8000/health
```

Example protected evaluate request:

```bash
curl -X POST http://127.0.0.1:8000/evaluate \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-demo-key" \
  -d '{"features":["AI dashboard"],"channels":["SEO"],"competitors":["Competitor A"],"milestones":["MVP"],"marketing_strength":70,"product_readiness":65,"competition_intensity":60}'
```

For deployment, use a start command like:

```bash
uvicorn api:app --host 0.0.0.0 --port $PORT
```

If you deploy from the full repository, set the service root directory to `rendor`. If you deploy only this folder, the included `Procfile` gives Render and Railway a ready start command.

Then load the saved scenario with:

```python
from dataset_loader import load_scenario_from_checkpoints

scenario = load_scenario_from_checkpoints()
```

For mobile-app generation, see `newly_prompt.md` in this folder.

Deployment files included in this bundle:

- `.env.example`
- `Procfile`
