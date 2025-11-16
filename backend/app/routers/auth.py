from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import UserCreate, UserLogin, UserResponse
from app.services.auth import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/signup", response_model=UserResponse)
def signup(user: UserCreate, db: Session = Depends(get_db)):
    new_user = AuthService.register_user(db, user)
    return AuthService.login_user(db, UserLogin(email=user.email, password=user.password))


@router.post("/login", response_model=UserResponse)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    return AuthService.login_user(db, login_data)
