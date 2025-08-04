import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()
database_url = os.environ.get("DATABASE_URL")

try:
    engine = create_engine(database_url)
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1"))
        print("✅ Database connection successful!")
        
        # Test tables
        result = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"))
        tables = [row[0] for row in result]
        print(f"Available tables: {tables}")
        
        # Test company_info table specifically
        try:
            result = conn.execute(text("SELECT COUNT(*) FROM company_info"))
            count = result.fetchone()[0]
            print(f"✅ Company info table exists with {count} records")
        except Exception as e:
            print(f"❌ Company info table not found: {e}")
        
except Exception as e:
    print(f"❌ Database connection failed: {e}")

if __name__ == "__main__":
    print("Testing database connection for chatbot...") 