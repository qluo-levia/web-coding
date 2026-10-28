"""Start the local preview independently of the launching terminal."""
from pathlib import Path
import subprocess, sys, urllib.request, time, webbrowser
root = Path(__file__).resolve().parent
url = 'http://127.0.0.1:4174/'
def ready():
    try:
        with urllib.request.urlopen(url, timeout=2) as response:
            return response.status == 200
    except OSError:
        return False
if not ready():
    with (root / 'preview.log').open('a') as log:
        subprocess.Popen([sys.executable, str(root / 'serve.py')], cwd=root,
                         stdin=subprocess.DEVNULL, stdout=log, stderr=log,
                         start_new_session=True, close_fds=True)
    for _ in range(40):
        if ready(): break
        time.sleep(.25)
if not ready():
    raise SystemExit('Preview could not start. See preview.log in the project folder.')
print('The Language Gap is running: ' + url + '?v=25')
if '--open' in sys.argv: webbrowser.open(url + '?v=25')
