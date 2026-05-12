from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """
    Tüm ORM modellerinin miras alacağı base class.
    SQLAlchemy 2.0 style declarative base.
    """
    pass