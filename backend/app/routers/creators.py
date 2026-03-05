from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.creator import Creator
from app.schemas.creator import CreatorRegister, CreatorLogin, CreatorResponse, CreatorUpdate, Token
from app.auth import hash_password, verify_password, create_access_token, get_current_creator
from app.limiter import limiter

router = APIRouter(prefix="/creators", tags=["Creators"])

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
def register(request: Request, payload: CreatorRegister, db: Session = Depends(get_db)):
    existing = db.query(Creator).filter(
        (Creator.username == payload.username) | (Creator.email == payload.email)
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already registered"
        )
    creator = Creator(
        username=payload.username,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        display_name=payload.display_name or payload.username,
    )
    db.add(creator)
    db.commit()
    db.refresh(creator)
    token = create_access_token(data={"sub": creator.id})
    return {"access_token": token, "token_type": "bearer", "creator": creator}

@router.post("/login", response_model=Token)
@limiter.limit("10/minute")
def login(request: Request, payload: CreatorLogin, db: Session = Depends(get_db)):
    creator = db.query(Creator).filter(Creator.username == payload.username).first()
    if not creator or not verify_password(payload.password, creator.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    token = create_access_token(data={"sub": creator.id})
    return {"access_token": token, "token_type": "bearer", "creator": creator}

@router.get("/me", response_model=CreatorResponse)
def get_me(current_creator: Creator = Depends(get_current_creator)):
    return current_creator

@router.patch("/me", response_model=CreatorResponse)
def update_me(
    payload: CreatorUpdate,
    db: Session = Depends(get_db),
    current_creator: Creator = Depends(get_current_creator)
):
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(current_creator, field, value)
    db.commit()
    db.refresh(current_creator)
    return current_creator

@router.get("/{creator_id}", response_model=CreatorResponse)
def get_creator(creator_id: str, db: Session = Depends(get_db)):
    creator = db.query(Creator).filter(Creator.id == creator_id).first()
    if not creator:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Creator not found"
        )
    return creator