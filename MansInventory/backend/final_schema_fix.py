import psycopg2

DATABASE_URL = "postgresql://postgres:Abberh113@localhost:5432/mans_inventory"

def fix():
    print("Connecting to DB (sync) to fix schema...")
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        print("Executing ALTER TABLE command...")
        cur.execute("ALTER TABLE product ADD COLUMN image_path VARCHAR;")
        conn.commit()
        print("Success. 'image_path' column added.")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Result: {e}")

if __name__ == "__main__":
    fix()
