"""
Test Database Connection Script
Run this to test if your database connection is working
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pos_backend.settings')

try:
    django.setup()
    from django.db import connection
    
    print("=" * 60)
    print("Testing Database Connection...")
    print("=" * 60)
    print()
    
    # Try to connect
    try:
        connection.ensure_connection()
        print("✓ SUCCESS: Database connection working!")
        print()
        
        # Get database info
        db_info = connection.get_connection_params()
        print("Database Configuration:")
        print(f"  Database: {db_info.get('database', 'N/A')}")
        print(f"  User: {db_info.get('user', 'N/A')}")
        print(f"  Host: {db_info.get('host', 'N/A')}")
        print(f"  Port: {db_info.get('port', 'N/A')}")
        print()
        
        # Test query
        with connection.cursor() as cursor:
            cursor.execute("SELECT version();")
            version = cursor.fetchone()
            print(f"PostgreSQL Version: {version[0]}")
            print()
        
        print("=" * 60)
        print("✓ Database is ready! You can now run migrations.")
        print("=" * 60)
        print()
        print("Next steps:")
        print("1. Run: python manage.py makemigrations")
        print("2. Run: python manage.py migrate")
        print("3. Run: python manage.py createsuperuser")
        
    except Exception as e:
        print("✗ ERROR: Database connection failed!")
        print()
        print(f"Error details: {str(e)}")
        print()
        print("=" * 60)
        print("Troubleshooting:")
        print("=" * 60)
        print()
        print("1. Check if PostgreSQL is installed and running")
        print("2. Verify .env file exists in pos_backend directory")
        print("3. Check .env file has correct database credentials:")
        print("   - DB_NAME=pos_db")
        print("   - DB_USER=postgres")
        print("   - DB_PASSWORD=your_postgres_password")
        print("   - DB_HOST=localhost")
        print("   - DB_PORT=5432")
        print()
        print("4. Make sure database 'pos_db' exists in PostgreSQL")
        print("5. Verify PostgreSQL service is running")
        print()
        sys.exit(1)
        
except Exception as e:
    print("✗ ERROR: Could not setup Django")
    print(f"Error: {str(e)}")
    print()
    print("Make sure you're in the pos_backend directory")
    print("and virtual environment is activated")
    sys.exit(1)


