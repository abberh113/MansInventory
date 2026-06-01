import os
import re

def clean_secrets(directory):
    patterns = [
        (r'postgresql\+asyncpg://[^:]+:[^@]+@', 'postgresql+asyncpg://user:password@'),
        (r'postgresql://user:password@]+@', 'postgresql://user:password@'),
        (r'PASSWORD\s*=\s*"[^"]+"', 'PASSWORD = "YOUR_PASSWORD_HERE"'),
        (r'SECRET_KEY\s*=\s*"[^"]+"', 'SECRET_KEY = "YOUR_SECRET_KEY_HERE"'),
        (r'SUPABASE_KEY\s*=\s*"[^"]+"', 'SUPABASE_KEY = "YOUR_SUPABASE_KEY_HERE"'),
        (r'SMTP_PASS\s*=\s*"[^"]+"', 'SMTP_PASS = "YOUR_SMTP_PASS_HERE"'),
    ]
    
    for root, dirs, files in os.walk(directory):
        if '.git' in root:
            continue
        for file in files:
            if file.endswith(('.py', '.md', '.txt', '.json', '.yaml', '.yml')):
                path = os.path.join(root, file)
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    new_content = content
                    for pattern, repl in patterns:
                        new_content = re.sub(pattern, repl, new_content)
                    
                    if new_content != content:
                        with open(path, 'w', encoding='utf-8') as f:
                            f.write(new_content)
                        print(f"Cleaned: {path}")
                except Exception as e:
                    print(f"Error cleaning {path}: {e}")

if __name__ == "__main__":
    clean_secrets(".")
