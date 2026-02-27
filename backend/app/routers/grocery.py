from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.models.grocery import GroceryItem

router = APIRouter(prefix="/grocery", tags=["grocery"])

class ItemCreate(BaseModel):
    user_email: str
    name: str
    qty: float
    unit: str = ""
    category: str

class ItemUpdate(BaseModel):
    name: Optional[str] = None
    qty: Optional[float] = None
    unit: Optional[str] = None
    category: Optional[str] = None
    is_purchased: Optional[bool] = None

@router.get("/{email}")
def get_grocery_list(email: str, db: Session = Depends(get_db)):
    return db.query(GroceryItem).filter(GroceryItem.user_email == email).all()

@router.post("/")
def add_item(item: ItemCreate, db: Session = Depends(get_db)):
    existing_item = db.query(GroceryItem).filter(
        func.lower(GroceryItem.name) == item.name.lower(),
        GroceryItem.user_email == item.user_email,
        func.lower(func.coalesce(GroceryItem.unit, "")) == item.unit.lower(),
        GroceryItem.is_purchased == False
    ).first()

    if existing_item:
        existing_item.qty += item.qty
        db.commit()
        db.refresh(existing_item)
        return existing_item

    new_item = GroceryItem(
        user_email=item.user_email,
        name=item.name,
        qty=item.qty,
        unit=item.unit,
        category=item.category,
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item

@router.put("/{item_id}")
def update_item(item_id: int, updates: ItemUpdate, db: Session = Depends(get_db)):
    new_item = db.query(GroceryItem).filter(GroceryItem.id == item_id).first()
    if not new_item:
        raise HTTPException(status_code=404, detail="Item not found")

    update = updates.model_dump(exclude_unset=True)
    for key, value in update.items():
        setattr(new_item, key, value)

    db.commit()
    db.refresh(new_item)
    return new_item


@router.delete("/{item_id}")
def delete_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(GroceryItem).filter(GroceryItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    db.delete(item)
    db.commit()
    return {"detail": "Item deleted"}
