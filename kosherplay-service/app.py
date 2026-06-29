# KosherPlay CRM automation service (Python + Selenium + headless Chrome).
#
# crm.kosherplay.com is an Angular SPA with no public API, so every action is
# driven through a real headless Chrome browser. The browser logs in ONCE and is
# kept alive in memory (module-level `_drv`) so repeat calls are fast. Selenium
# is NOT thread-safe, so every CRM operation runs under a single global lock.
#
# Run with ONE worker (the persistent browser + lock assume a single process):
#   gunicorn --workers 1 --threads 4 --timeout 180 --bind 0.0.0.0:$PORT app:app
#
# Required env:  KP_USER, KP_PWD                (CRM credentials)
#               KP_SHARED_SECRET               (shared secret; callers must send
#                                               it in the X-KP-Secret header)
# Optional env: CHROME_BIN, CHROMEDRIVER        (set by the Dockerfile)
#
# Endpoints (all require the X-KP-Secret header):
#   GET  /health                         → {ok:true}
#   POST /api/action {device,phone,action}  action ∈ suspend|activate|gp_open|gp_block
#   GET  /api/code?type=free|chrome|magen|pc|combined
#   GET  /api/balance

import os, time, threading, re, json, uuid
from functools import wraps
from flask import Flask, request, jsonify
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

CRM = "https://crm.kosherplay.com"
USER = os.environ.get("KP_USER", "")
PWD = os.environ.get("KP_PWD", "")
SHARED_SECRET = os.environ.get("KP_SHARED_SECRET", "")

ACTIONS = {
    "suspend":  ("סטטוס משתמש", "כשר פליי - מושהה"),
    "activate": ("סטטוס משתמש", "כשר פליי - פעיל"),
    "gp_open":  ("גוגל פליי", "פתוח ל 24 שעות"),
    "gp_block": ("גוגל פליי", "חסום"),
}
CODE_TYPES = {"free": "חינמי", "chrome": "כרום", "magen": "מגן", "pc": "למחשב", "combined": "משולב"}

_lock = threading.Lock()
_drv = {"d": None}
_cache = {}


# ---------------------------------------------------------------- browser ----
def _login(d):
    w = WebDriverWait(d, 30)
    d.get(CRM)
    w.until(EC.presence_of_element_located((By.ID, "mat-input-0")))
    d.find_element(By.ID, "mat-input-0").send_keys(USER)
    d.find_element(By.ID, "mat-input-1").send_keys(PWD)
    d.find_element(By.ID, "mat-input-1").send_keys(Keys.ENTER)
    w.until(lambda x: "/modules" in x.current_url)
    time.sleep(2)


def _new_driver():
    o = Options()
    o.add_argument("--headless=new")
    o.add_argument("--no-sandbox")
    o.add_argument("--disable-dev-shm-usage")
    o.add_argument("--disable-gpu")
    # --- low-memory flags: squeeze headless Chrome into a 512MB (free) instance.
    # Less robust than more RAM, but fine for an internal admin tool. ---
    o.add_argument("--single-process")          # collapse browser+renderer+gpu → 1 process
    o.add_argument("--no-zygote")
    o.add_argument("--renderer-process-limit=1")
    o.add_argument("--disable-extensions")
    o.add_argument("--disable-background-networking")
    o.add_argument("--disable-default-apps")
    o.add_argument("--disable-sync")
    o.add_argument("--disable-translate")
    o.add_argument("--disable-software-rasterizer")
    o.add_argument("--mute-audio")
    o.add_argument("--disable-features=site-per-process,Translate,BackForwardCache")
    o.add_argument("--blink-settings=imagesEnabled=false")   # skip images → big RAM/bandwidth cut
    o.add_argument("--js-flags=--max-old-space-size=256")
    o.add_argument("--window-size=1280,900")
    chrome_bin = os.environ.get("CHROME_BIN")
    if chrome_bin:
        o.binary_location = chrome_bin
    driver_path = os.environ.get("CHROMEDRIVER")
    if driver_path:
        return webdriver.Chrome(service=Service(executable_path=driver_path), options=o)
    return webdriver.Chrome(options=o)  # fall back to Selenium Manager


def _driver():
    d = _drv["d"]
    try:
        if d is None:
            raise Exception()
        _ = d.current_url
        if "login" in d.current_url:
            _login(d)
        return d
    except Exception:
        d = _new_driver()
        _login(d)
        _drv["d"] = d
        return d


# ----------------------------------------------------------- mat helpers ----
def _find_select(d, label):
    for el in d.find_elements(By.CSS_SELECTOR, "mat-select"):
        try:
            if label in el.find_element(By.XPATH, "./ancestor::mat-form-field[1]").text:
                return el
        except Exception:
            pass
    return None


def _wait_select(d, label, t=12):
    end = time.time() + t
    while time.time() < end:
        s = _find_select(d, label)
        if s:
            return s
        time.sleep(0.25)
    return None


def _open_customer(d, device, phone):
    key = (device.strip(), phone.strip())
    w = WebDriverWait(d, 30)
    if _cache.get(key):
        d.get(_cache[key])
        if _wait_select(d, "סטטוס משתמש", 12):
            return
    d.get(f"{CRM}/modules/1")
    w.until(EC.element_to_be_clickable((By.XPATH, "//*[normalize-space(text())='חיפוש חיצוני']")))
    d.execute_script("arguments[0].click();",
                     d.find_element(By.XPATH, "//*[normalize-space(text())='חיפוש חיצוני']"))
    w.until(EC.presence_of_element_located((By.XPATH, "//input[@placeholder='מזהה המכשיר']")))
    d.find_element(By.XPATH, "//input[@placeholder='מזהה המכשיר']").send_keys(device.strip())
    d.find_element(By.XPATH, "//input[@placeholder='טלפון']").send_keys(phone.strip())
    d.execute_script("arguments[0].click();", d.find_element(By.XPATH, "//button[normalize-space()='חיפוש']"))
    w.until(lambda x: "/modules/1/" in x.current_url)
    clean = d.current_url.split("?")[0]
    _cache[key] = clean
    d.get(clean)  # hard reload — otherwise the SPA keeps stale cached state
    _wait_select(d, "סטטוס משתמש", 15)


# --------------------------------------------------------------- actions ----
def do_action(device, phone, action):
    label, value = ACTIONS[action]
    with _lock:
        d = _driver()
        _open_customer(d, device, phone)
        sel = _wait_select(d, label)
        if not sel:
            return {"ok": False, "msg": "הפקד לא זמין (אולי המנוי מושהה — יש להפעיל קודם)"}
        if value in (sel.text or ""):
            return {"ok": True, "msg": f"{label}: {sel.text.strip()} (ללא שינוי)"}
        d.execute_script("arguments[0].click();", sel)
        opt = None
        end = time.time() + 8
        while time.time() < end and not opt:
            for o in d.find_elements(By.CSS_SELECTOR, "mat-option"):
                if value in (o.text or ""):
                    opt = o
                    break
            if not opt:
                time.sleep(0.2)
        if not opt:
            return {"ok": False, "msg": f"האפשרות '{value}' לא נמצאה"}
        d.execute_script("arguments[0].click();", opt)
        d.execute_script("arguments[0].click();", d.find_element(By.XPATH, "//button[contains(.,'שמירה וחזרה')]"))
        WebDriverWait(d, 15).until(
            lambda x: x.current_url.rstrip('/').endswith('/modules/1') or '/modules/1?' in x.current_url)
        _open_customer(d, device, phone)
        s2 = _wait_select(d, label, 8)
        final = s2.text.strip() if s2 else "(מוסתר—מושהה)"
        ok = value in final or (action == "gp_open" and s2 is None)
        return {"ok": ok, "msg": f"{label}: {final}"}


def generate_code(code_type):
    token = CODE_TYPES[code_type]
    with _lock:
        d = _driver()
        d.get(f"{CRM}/modules/26")
        time.sleep(4)
        WebDriverWait(d, 30).until(EC.element_to_be_clickable((By.XPATH, "//button[normalize-space()='קוד']")))
        d.execute_script("arguments[0].click();", d.find_element(By.XPATH, "//button[normalize-space()='קוד']"))
        time.sleep(2)
        tg = next((t for t in d.find_elements(By.CSS_SELECTOR, "mat-button-toggle") if token in (t.text or "")), None)
        if not tg:
            return {"ok": False, "msg": "סוג קוד לא נמצא"}
        d.execute_script("arguments[0].click();", tg.find_element(By.CSS_SELECTOR, "button"))
        code = None
        for _ in range(24):
            time.sleep(0.5)
            try:
                c = d.find_element(By.CSS_SELECTOR, "lib-promocode .code-display span").text.strip()
            except Exception:
                c = ""
            if c and set(c) != {"0"} and any(ch.isdigit() for ch in c):
                code = c
                break
        return {"ok": bool(code), "code": code, "msg": "נוצר קוד" if code else "אין מספיק קרדיטים"}


def get_balance():
    with _lock:
        d = _driver()
        d.get(f"{CRM}/modules/26")
        time.sleep(3)
        m = re.search(r"יתרתך ₪?\s*(\d+)", d.find_element(By.TAG_NAME, "body").text)
        return {"balance": m.group(1) if m else None}


# ------------------------------------------------------- scheduled timers ----
# "Temporary action": run an action now, and the opposite action when the timer
# elapses — executed HERE in the always-on service, so the user can close the
# browser entirely. Jobs are persisted to a file so a graceful restart resumes
# them (set KP_DATA_FILE to a path on a persistent disk to survive redeploys).
TIMER_TARGETS = {"sub": ("suspend", "activate"), "gp": ("gp_open", "gp_block")}
DATA_FILE = os.environ.get("KP_DATA_FILE", "kp_schedules.json")
_jobs = []  # [{id, device, phone, t, end_action, run_at_ms}]
_jobs_lock = threading.Lock()


def _save_jobs():
    try:
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(_jobs, f, ensure_ascii=False)
    except Exception:
        pass


def _load_jobs():
    global _jobs
    try:
        with open(DATA_FILE, encoding="utf-8") as f:
            _jobs = json.load(f) or []
    except Exception:
        _jobs = []


def _run_end(job):
    try:
        do_action(job["device"], job["phone"], job["end_action"])
    except Exception:
        pass


def _scheduler():
    while True:
        now = time.time() * 1000
        due = []
        with _jobs_lock:
            if _jobs:
                due = [j for j in _jobs if j["run_at_ms"] <= now]
                if due:
                    _jobs[:] = [j for j in _jobs if j["run_at_ms"] > now]
                    _save_jobs()
        for j in due:
            _run_end(j)
        time.sleep(5)


def timer_start(device, phone, t, duration_ms):
    now_action, end_action = TIMER_TARGETS[t]
    res = do_action(device, phone, now_action)  # the immediate action, now
    job = {
        "id": uuid.uuid4().hex, "device": device, "phone": phone, "t": t,
        "end_action": end_action, "run_at_ms": int(time.time() * 1000) + int(duration_ms),
    }
    with _jobs_lock:
        _jobs.append(job)
        _save_jobs()
    return {"ok": res.get("ok", False), "msg": res.get("msg", ""), "timer": job}


def timer_list():
    with _jobs_lock:
        return {"timers": list(_jobs)}


def timer_finish(job_id):
    job = None
    with _jobs_lock:
        for j in _jobs:
            if j["id"] == job_id:
                job = j
                break
        if job:
            _jobs.remove(job)
            _save_jobs()
    if not job:
        return {"ok": False, "msg": "טיימר לא נמצא"}
    res = do_action(job["device"], job["phone"], job["end_action"])
    return {"ok": res.get("ok", False), "msg": res.get("msg", ""), "id": job_id}


def _bootstrap_jobs():
    # On startup run any jobs that came due while the service was down.
    now = time.time() * 1000
    with _jobs_lock:
        overdue = [j for j in _jobs if j["run_at_ms"] <= now]
        if overdue:
            _jobs[:] = [j for j in _jobs if j["run_at_ms"] > now]
            _save_jobs()
    for j in overdue:
        _run_end(j)


_load_jobs()
threading.Thread(target=_bootstrap_jobs, daemon=True).start()
threading.Thread(target=_scheduler, daemon=True).start()


# ----------------------------------------------------------------- flask ----
app = Flask(__name__)


def require_secret(fn):
    @wraps(fn)
    def wrapper(*a, **k):
        if SHARED_SECRET and request.headers.get("X-KP-Secret") != SHARED_SECRET:
            return jsonify({"ok": False, "msg": "unauthorized"}), 401
        return fn(*a, **k)
    return wrapper


@app.get("/health")
def health():
    return jsonify({"ok": True})


@app.post("/api/action")
@require_secret
def api_action():
    body = request.get_json(silent=True) or {}
    device = str(body.get("device", "")).strip()
    phone = str(body.get("phone", "")).strip()
    action = str(body.get("action", "")).strip()
    if action not in ACTIONS:
        return jsonify({"ok": False, "msg": "פעולה לא תקינה"}), 400
    if not device or not phone:
        return jsonify({"ok": False, "msg": "חסר מזהה או טלפון"}), 400
    try:
        return jsonify(do_action(device, phone, action))
    except Exception as e:
        return jsonify({"ok": False, "msg": f"שגיאה: {e}"}), 500


@app.get("/api/code")
@require_secret
def api_code():
    code_type = request.args.get("type", "")
    if code_type not in CODE_TYPES:
        return jsonify({"ok": False, "msg": "סוג קוד לא תקין"}), 400
    try:
        return jsonify(generate_code(code_type))
    except Exception as e:
        return jsonify({"ok": False, "msg": f"שגיאה: {e}"}), 500


@app.get("/api/balance")
@require_secret
def api_balance():
    try:
        return jsonify(get_balance())
    except Exception as e:
        return jsonify({"balance": None, "msg": f"שגיאה: {e}"}), 500


@app.post("/api/timer/start")
@require_secret
def api_timer_start():
    b = request.get_json(silent=True) or {}
    device = str(b.get("device", "")).strip()
    phone = str(b.get("phone", "")).strip()
    t = str(b.get("t", "")).strip()
    if t not in TIMER_TARGETS:
        return jsonify({"ok": False, "msg": "סוג טיימר לא תקין"}), 400
    if not device or not phone:
        return jsonify({"ok": False, "msg": "חסר מזהה או טלפון"}), 400
    try:
        dm = int(b.get("duration_ms", 0))
    except Exception:
        dm = 0
    if dm <= 0:
        return jsonify({"ok": False, "msg": "משך זמן לא תקין"}), 400
    try:
        return jsonify(timer_start(device, phone, t, dm))
    except Exception as e:
        return jsonify({"ok": False, "msg": f"שגיאה: {e}"}), 500


@app.get("/api/timer/list")
@require_secret
def api_timer_list():
    return jsonify(timer_list())


@app.post("/api/timer/finish")
@require_secret
def api_timer_finish():
    b = request.get_json(silent=True) or {}
    jid = str(b.get("id", "")).strip()
    if not jid:
        return jsonify({"ok": False, "msg": "חסר מזהה טיימר"}), 400
    try:
        return jsonify(timer_finish(jid))
    except Exception as e:
        return jsonify({"ok": False, "msg": f"שגיאה: {e}"}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))
