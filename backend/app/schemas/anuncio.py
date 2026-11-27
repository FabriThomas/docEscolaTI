"""
Pydantic v2 Schemas: Anuncios (CRUD, Pausar, Boost, Estatisticas),
Busca PostGIS, Favoritos, Comparador e Fotos WebP sem EXIF.
Conforms to: ADR-11, ADR-13, RB-06 (EDTS-373 / SPRINT13_006)
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class AnuncioCreateRequest(BaseModel):
    titulo: str = Field(..., min_length=3, max_length=150)
    descricao: Optional[str] = Field(default=None, max_length=4000)
    categoria: str = Field(..., description="gpu, cpu, motherboard, ram, psu, storage, etc.")
    marca: Optional[str] = Field(default=None, max_length=80)
    modelo_ou_sku: Optional[str] = Field(default=None, max_length=120)
    condicao: str = Field(default="USADO", pattern="^(NOVO|SEMINOVO|USADO|DEFEITO_SUCATA)$")
    preco_centavos: int = Field(..., ge=0)
    bairro_aproximado: Optional[str] = Field(default=None, max_length=120)
    cidade: str = Field(..., min_length=2, max_length=100)
    estado: str = Field(..., min_length=2, max_length=2)
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    specs: Dict[str, str] = Field(default_factory=dict)


class AnuncioUpdateRequest(BaseModel):
    titulo: Optional[str] = Field(default=None, min_length=3, max_length=150)
    descricao: Optional[str] = Field(default=None, max_length=4000)
    condicao: Optional[str] = Field(default=None, pattern="^(NOVO|SEMINOVO|USADO|DEFEITO_SUCATA)$")
    preco_centavos: Optional[int] = Field(default=None, ge=0)
    specs: Optional[Dict[str, str]] = None


class AnuncioPhotoItem(BaseModel):
    id: str
    storage_path: str
    size_bytes: int
    width: int
    height: int
    format: str = "WEBP"
    exif_stripped: bool = True
    sha256_hash: str
    is_cover: bool = False


class AnuncioResponse(BaseModel):
    id: str
    seller_id: str
    titulo: str
    descricao: Optional[str] = None
    categoria: str
    marca: Optional[str] = None
    modelo_ou_sku: Optional[str] = None
    condicao: str
    preco_centavos: int
    status: str
    bairro_aproximado: Optional[str] = None
    cidade: str
    estado: str
    fuzzy_latitude: float
    fuzzy_longitude: float
    distancia_km: Optional[float] = None
    specs: Dict[str, str] = Field(default_factory=dict)
    fotos: List[AnuncioPhotoItem] = Field(default_factory=list)
    boost_active_until: Optional[datetime] = None
    views_count: int = 0
    favorites_count: int = 0
    created_at: datetime
    updated_at: datetime


class AnuncioCursorPageResponse(BaseModel):
    items: List[AnuncioResponse]
    next_cursor: Optional[str] = None
    has_more: bool = False
    limit: int


class AnuncioBoostRequest(BaseModel):
    duracao_horas: int = Field(default=24, ge=1, le=168)
    moedas_custo: int = Field(default=20, ge=5, le=500)


class AnuncioBoostResponse(BaseModel):
    anuncio_id: str
    boost_active_until: datetime
    moedas_debitadas: int
    status: str = "BOOST_ATIVO"


class AnuncioStatsResponse(BaseModel):
    anuncio_id: str
    status: str
    views_count: int
    favorites_count: int
    fotos_count: int
    boost_ativo: bool
    boost_active_until: Optional[datetime] = None


class AnuncioFavoriteResponse(BaseModel):
    anuncio_id: str
    user_id: str
    is_favorited: bool
    favorites_count: int


class AnuncioComparadorResponse(BaseModel):
    total_comparados: int
    anuncios: List[AnuncioResponse]
    spec_keys: List[str]
    specs_matrix: Dict[str, Dict[str, Optional[str]]]
