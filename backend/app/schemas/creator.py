from pydantic import BaseModel, EmailStr, field_validator
from datetime import datetime
from typing import Optional

class CreatorRegister(BaseModel):
    username: str
    email: EmailStr
    password: str
    display_name: Optional[str] = None

    @field_validator('username')
    @classmethod
    def username_valid(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3:
            raise ValueError('Username must be at least 3 characters')
        if len(v) > 30:
            raise ValueError('Username must be 30 characters or fewer')
        if not v.replace('_', '').replace('-', '').isalnum():
            raise ValueError('Username can only contain letters, numbers, hyphens and underscores')
        return v

    @field_validator('password')
    @classmethod
    def password_valid(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one number')
        return v

class CreatorLogin(BaseModel):
    username: str
    password: str

class CreatorUpdate(BaseModel):
    display_name: Optional[str] = None
    bio: Optional[str] = None

class CreatorResponse(BaseModel):
    id: str
    username: str
    email: str
    display_name: Optional[str] = None
    bio: Optional[str] = None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}

class CreatorPublic(BaseModel):
    id: str
    username: str
    display_name: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}

class Token(BaseModel):
    access_token: str
    token_type: str
    creator: CreatorResponse