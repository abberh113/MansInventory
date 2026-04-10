from app.main import app

# Vercel's Python runtime specifically looks for 'app' or 'application'
# We export it here so it's available at the root level of the backend folder.
application = app
