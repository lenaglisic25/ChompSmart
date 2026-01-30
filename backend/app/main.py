from fastapi import FastAPI
from app.database import engine, Base
from app.api import users, profile, preferences
from fastapi.middleware.cors import CORSMiddleware

Base.metadata.create_all(bind=engine)

app = FastAPI(title="ChompSmart DB")

app.include_router(users.router)
app.include_router(profile.router)
app.include_router(preferences.router)

@app.get("/")
def root():
    return {"status": "Backend running"}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# create tables
Base.metadata.create_all(bind=engine)
