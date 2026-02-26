from sqlalchemy import Column, Integer, String, Float, Boolean
from app.database import Base

class GroceryItem(Base):
    __tablename__ = "grocery_items"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String, index=True)
    name = Column(String, nullable=False)
    qty = Column(Float, default=1.0)
    unit = Column(String, nullable=True, default="")
    category = Column(String, default="Other")
    is_purchased = Column(Boolean, default=False)

