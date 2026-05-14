"""
Geriye dönük: yeni kod `database` modülünden `get_db` kullanmalıdır.
"""
from database import close_db, connect_db, get_db, get_database, seed_initial_data_if_empty

__all__ = ["get_db", "get_database", "connect_db", "close_db", "seed_initial_data_if_empty"]
