from app.main import app

# This is the entry point for Vercel
# Vercel needs the FastAPI instance to be named 'app'
# We export it here so it's available at the root of the project
app = app
