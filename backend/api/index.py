import sys
import os

# Ensure the root 'backend' directory is in the python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app

# Vercel needs 'app'
application = app
