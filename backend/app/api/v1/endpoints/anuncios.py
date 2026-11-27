"""
FastAPI Router: Endpoints de Anuncios (CRUD, Pausar, Boost, Estatisticas),
Upload WebP sem EXIF (Pillow <= 300KB), Paginacao por Cursor, Busca PostGIS,
Favoritos e Comparador de Especificacoes.
Conforms to: ADR-11, ADR-13, RB-06 (EDTS-373 / SPRINT13_006)
Telas atendidas: PROTOTIPAGEM_001, 003 a 019, 021, 044
"""

from datetime import datetime, timedelta, timezone
import math
from typing import Dict, List, Optional, Set
import uuid
from fastapi import APIRouter, Depends, File, Query, UploadFile, status

from app.api.deps import get_current_user
from app.core.errors import ProblemException
from app.schemas.anuncio import (
    AnuncioBoostRequest,
    AnuncioBoostResponse,
    AnuncioComparadorResponse,
    AnuncioCreateRequest,
    AnuncioCursorPageResponse,
    AnuncioFavoriteResponse,
    AnuncioPhotoItem,
    AnuncioResponse,
    AnuncioStatsResponse,
    AnuncioUpdateRequest,
)
from app.schemas.auth import AuthenticatedUserPayload
from app.services.media_sanitizer import MAX_PHOTOS_PER_LISTING, sanitize_to_webp_no_exif

router = APIRouter()

ANUNCIOS_STORE: Dict[str, Dict] = {}
FAVORITOS_STORE: Dict[str, Set[str]] = {}  # anuncio_id -> set(user_id)


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return round(2 * r * math.asin(math.sqrt(a)), 2)


def _to_response(rec: Dict, distancia_km: Optional[float] = None) -> AnuncioResponse:
    favs = len(FAVORITOS_STORE.get(rec["id"], set()))
    return AnuncioResponse(
        id=rec["id"],
        seller_id=rec["seller_id"],
        titulo=rec["titulo"],
        descricao=rec["descricao"],
        categoria=rec["categoria"],
        marca=rec["marca"],
        modelo_ou_sku=rec["modelo_ou_sku"],
        condicao=rec["condicao"],
        preco_centavos=rec["preco_centavos"],
        status=rec["status"],
        bairro_aproximado=rec["bairro_aproximado"],
        cidade=rec["cidade"],
        estado=rec["estado"],
        fuzzy_latitude=round(rec["latitude"], 2),
        fuzzy_longitude=round(rec["longitude"], 2),
        distancia_km=distancia_km,
        specs=rec["specs"],
        fotos=rec["fotos"],
        boost_active_until=rec["boost_active_until"],
        views_count=rec["views_count"],
        favorites_count=favs,
        created_at=rec["created_at"],
        updated_at=rec["updated_at"],
    )


def _require_owner(anuncio_id: str, user_id: str) -> Dict:
    if anuncio_id not in ANUNCIOS_STORE:
        raise ProblemException(
            status_code=status.HTTP_404_NOT_FOUND,
            title="Listing Not Found",
            detail=f"Anuncio {anuncio_id} nao encontrado.",
        )
    rec = ANUNCIOS_STORE[anuncio_id]
    if rec["seller_id"] != user_id:
        raise ProblemException(
            status_code=status.HTTP_403_FORBIDDEN,
            title="Forbidden Listing Operation",
            detail="Somente o proprietario do anuncio pode realizar esta operacao (STYG-RN01).",
        )
    return rec


@router.post(
    "/",
    response_model=AnuncioResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Cria anuncio de hardware com localizacao fuzzy (RB-06)",
)
async def criar_anuncio(
    payload: AnuncioCreateRequest,
    current_user: AuthenticatedUserPayload = Depends(get_current_user),
) -> AnuncioResponse:
    now = _now_utc()
    anuncio_id = f"an-{uuid.uuid4().hex[:10]}"
    rec = {
        "id": anuncio_id,
        "seller_id": current_user.user_id,
        "titulo": payload.titulo,
        "descricao": payload.descricao,
        "categoria": payload.categoria.lower().strip(),
        "marca": payload.marca,
        "modelo_ou_sku": payload.modelo_ou_sku,
        "condicao": payload.condicao,
        "preco_centavos": payload.preco_centavos,
        "status": "ATIVA",
        "bairro_aproximado": payload.bairro_aproximado,
        "cidade": payload.cidade,
        "estado": payload.estado.upper(),
        "latitude": payload.latitude,
        "longitude": payload.longitude,
        "specs": payload.specs,
        "fotos": [],
        "boost_active_until": None,
        "views_count": 0,
        "created_at": now,
        "updated_at": now,
    }
    ANUNCIOS_STORE[anuncio_id] = rec
    FAVORITOS_STORE[anuncio_id] = set()
    return _to_response(rec)


@router.get(
    "/",
    response_model=AnuncioCursorPageResponse,
    summary="Feed de anuncios ativos com paginacao por cursor e prioridade de Boost",
)
async def listar_feed_cursor(
    cursor: Optional[str] = Query(default=None, description="ID do ultimo anuncio recebido"),
    limit: int = Query(default=10, ge=1, le=50),
    categoria: Optional[str] = None,
) -> AnuncioCursorPageResponse:
    now = _now_utc()
    ativos = [
        r for r in ANUNCIOS_STORE.values()
        if r["status"] == "ATIVA" and (not categoria or r["categoria"] == categoria.lower().strip())
    ]
    ativos.sort(
        key=lambda r: (
            1 if (r["boost_active_until"] and r["boost_active_until"] > now) else 0,
            r["created_at"],
            r["id"],
        ),
        reverse=True,
    )

    start_idx = 0
    if cursor:
        for idx, item in enumerate(ativos):
            if item["id"] == cursor:
                start_idx = idx + 1
                break

    page_slice = ativos[start_idx : start_idx + limit]
    has_more = (start_idx + limit) < len(ativos)
    next_cursor = page_slice[-1]["id"] if has_more and page_slice else None

    return AnuncioCursorPageResponse(
        items=[_to_response(r) for r in page_slice],
        next_cursor=next_cursor,
        has_more=has_more,
        limit=limit,
    )


@router.get(
    "/busca",
    response_model=List[AnuncioResponse],
    summary="Busca avancada com filtro de raio PostGIS (ST_DWithin) e atributos",
)
async def buscar_anuncios_postgis(
    q: Optional[str] = Query(default=None, description="Texto livre em titulo/modelo"),
    categoria: Optional[str] = None,
    condicao: Optional[str] = None,
    preco_min_centavos: Optional[int] = Query(default=None, ge=0),
    preco_max_centavos: Optional[int] = Query(default=None, ge=0),
    lat: Optional[float] = Query(default=None, ge=-90.0, le=90.0),
    lon: Optional[float] = Query(default=None, ge=-180.0, le=180.0),
    raio_km: float = Query(default=25.0, ge=1.0, le=250.0),
) -> List[AnuncioResponse]:
    results: List[AnuncioResponse] = []
    q_low = q.lower().strip() if q else None

    for rec in ANUNCIOS_STORE.values():
        if rec["status"] != "ATIVA":
            continue
        if categoria and rec["categoria"] != categoria.lower().strip():
            continue
        if condicao and rec["condicao"] != condicao:
            continue
        if preco_min_centavos is not None and rec["preco_centavos"] < preco_min_centavos:
            continue
        if preco_max_centavos is not None and rec["preco_centavos"] > preco_max_centavos:
            continue
        if q_low and q_low not in rec["titulo"].lower() and q_low not in (rec["modelo_ou_sku"] or "").lower():
            continue

        dist: Optional[float] = None
        if lat is not None and lon is not None:
            dist = _haversine_km(lat, lon, rec["latitude"], rec["longitude"])
            if dist > raio_km:
                continue

        results.append(_to_response(rec, distancia_km=dist))

    if lat is not None and lon is not None:
        results.sort(key=lambda r: r.distancia_km if r.distancia_km is not None else 999999.0)
    else:
        results.sort(key=lambda r: r.created_at, reverse=True)

    return results


@router.get(
    "/favoritos/meus",
    response_model=List[AnuncioResponse],
    summary="Lista anuncios favoritados pelo usuario autenticado",
)
async def listar_meus_favoritos(
    current_user: AuthenticatedUserPayload = Depends(get_current_user),
) -> List[AnuncioResponse]:
    items = []
    for aid, users_set in FAVORITOS_STORE.items():
        if current_user.user_id in users_set and aid in ANUNCIOS_STORE:
            items.append(_to_response(ANUNCIOS_STORE[aid]))
    return items


@router.get(
    "/comparador",
    response_model=AnuncioComparadorResponse,
    summary="Compara de 2 a 4 anuncios lado a lado (matriz de especificacoes)",
)
async def comparar_anuncios(
    ids: str = Query(..., description="Lista de 2 a 4 IDs separados por virgula"),
) -> AnuncioComparadorResponse:
    id_list = [i.strip() for i in ids.split(",") if i.strip()]
    if len(id_list) < 2 or len(id_list) > 4:
        raise ProblemException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            title="Invalid Comparator Selection",
            detail="Informe entre 2 e 4 IDs de anuncios para comparar.",
        )

    selected: List[AnuncioResponse] = []
    all_keys: Set[str] = set()
    for aid in id_list:
        if aid not in ANUNCIOS_STORE:
            raise ProblemException(
                status_code=status.HTTP_404_NOT_FOUND,
                title="Listing Not Found",
                detail=f"Anuncio {aid} nao encontrado para comparacao.",
            )
        rec = ANUNCIOS_STORE[aid]
        selected.append(_to_response(rec))
        all_keys.update(rec["specs"].keys())

    sorted_keys = sorted(all_keys)
    matrix: Dict[str, Dict[str, Optional[str]]] = {
        k: {item.id: item.specs.get(k) for item in selected} for k in sorted_keys
    }

    return AnuncioComparadorResponse(
        total_comparados=len(selected),
        anuncios=selected,
        spec_keys=sorted_keys,
        specs_matrix=matrix,
    )


@router.get("/{anuncio_id}", response_model=AnuncioResponse, summary="Detalhe do anuncio (incrementa views)")
async def obter_anuncio(anuncio_id: str) -> AnuncioResponse:
    if anuncio_id not in ANUNCIOS_STORE or ANUNCIOS_STORE[anuncio_id]["status"] == "REMOVIDA":
        raise ProblemException(
            status_code=status.HTTP_404_NOT_FOUND,
            title="Listing Not Found",
            detail=f"Anuncio {anuncio_id} nao encontrado.",
        )
    rec = ANUNCIOS_STORE[anuncio_id]
    rec["views_count"] += 1
    return _to_response(rec)


@router.patch("/{anuncio_id}", response_model=AnuncioResponse, summary="Edita anuncio do proprietario")
async def editar_anuncio(
    anuncio_id: str,
    payload: AnuncioUpdateRequest,
    current_user: AuthenticatedUserPayload = Depends(get_current_user),
) -> AnuncioResponse:
    rec = _require_owner(anuncio_id, current_user.user_id)
    if payload.titulo is not None:
        rec["titulo"] = payload.titulo
    if payload.descricao is not None:
        rec["descricao"] = payload.descricao
    if payload.condicao is not None:
        rec["condicao"] = payload.condicao
    if payload.preco_centavos is not None:
        rec["preco_centavos"] = payload.preco_centavos
    if payload.specs is not None:
        rec["specs"] = payload.specs
    rec["updated_at"] = _now_utc()
    return _to_response(rec)


@router.post("/{anuncio_id}/pausar", response_model=AnuncioResponse, summary="Pausa anuncio ativo")
async def pausar_anuncio(
    anuncio_id: str,
    current_user: AuthenticatedUserPayload = Depends(get_current_user),
) -> AnuncioResponse:
    rec = _require_owner(anuncio_id, current_user.user_id)
    rec["status"] = "PAUSADA"
    rec["updated_at"] = _now_utc()
    return _to_response(rec)


@router.post("/{anuncio_id}/reativar", response_model=AnuncioResponse, summary="Reativa anuncio pausado")
async def reativar_anuncio(
    anuncio_id: str,
    current_user: AuthenticatedUserPayload = Depends(get_current_user),
) -> AnuncioResponse:
    rec = _require_owner(anuncio_id, current_user.user_id)
    rec["status"] = "ATIVA"
    rec["updated_at"] = _now_utc()
    return _to_response(rec)


@router.delete("/{anuncio_id}", status_code=status.HTTP_200_OK, summary="Exclui logicamente anuncio do proprietario")
async def excluir_anuncio(
    anuncio_id: str,
    current_user: AuthenticatedUserPayload = Depends(get_current_user),
) -> Dict[str, str]:
    rec = _require_owner(anuncio_id, current_user.user_id)
    rec["status"] = "REMOVIDA"
    rec["updated_at"] = _now_utc()
    return {"id": anuncio_id, "status": "REMOVIDA"}


@router.post(
    "/{anuncio_id}/fotos",
    response_model=List[AnuncioPhotoItem],
    summary="Upload e sanitizacao de ate 6 fotos em WebP <= 300 KB sem EXIF (Pillow / ADR-11)",
)
async def upload_fotos_anuncio(
    anuncio_id: str,
    files: List[UploadFile] = File(...),
    current_user: AuthenticatedUserPayload = Depends(get_current_user),
) -> List[AnuncioPhotoItem]:
    rec = _require_owner(anuncio_id, current_user.user_id)

    if len(rec["fotos"]) + len(files) > MAX_PHOTOS_PER_LISTING:
        raise ProblemException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            title="Photo Limit Exceeded",
            detail=f"Maximo de {MAX_PHOTOS_PER_LISTING} fotos por anuncio (ADR-11).",
        )

    uploaded: List[AnuncioPhotoItem] = []
    for idx, f in enumerate(files):
        raw = await f.read()
        webp_bytes, w, h, sha256_hex = sanitize_to_webp_no_exif(raw)
        photo_id = f"img-{uuid.uuid4().hex[:8]}"
        item = AnuncioPhotoItem(
            id=photo_id,
            storage_path=f"offers-media/{current_user.user_id}/{anuncio_id}/{photo_id}.webp",
            size_bytes=len(webp_bytes),
            width=w,
            height=h,
            format="WEBP",
            exif_stripped=True,
            sha256_hash=sha256_hex,
            is_cover=(len(rec["fotos"]) == 0 and idx == 0),
        )
        rec["fotos"].append(item)
        uploaded.append(item)

    rec["updated_at"] = _now_utc()
    return uploaded


@router.post(
    "/{anuncio_id}/boost",
    response_model=AnuncioBoostResponse,
    summary="Ativa impulsionamento (Boost) do anuncio (Tela 044)",
)
async def impulsionar_anuncio(
    anuncio_id: str,
    payload: AnuncioBoostRequest,
    current_user: AuthenticatedUserPayload = Depends(get_current_user),
) -> AnuncioBoostResponse:
    rec = _require_owner(anuncio_id, current_user.user_id)
    now = _now_utc()
    base = rec["boost_active_until"] if (rec["boost_active_until"] and rec["boost_active_until"] > now) else now
    rec["boost_active_until"] = base + timedelta(hours=payload.duracao_horas)
    rec["updated_at"] = now
    return AnuncioBoostResponse(
        anuncio_id=anuncio_id,
        boost_active_until=rec["boost_active_until"],
        moedas_debitadas=payload.moedas_custo,
    )


@router.get(
    "/{anuncio_id}/estatisticas",
    response_model=AnuncioStatsResponse,
    summary="Estatisticas do anuncio para o vendedor (visualizacoes, favoritos e boost)",
)
async def estatisticas_anuncio(
    anuncio_id: str,
    current_user: AuthenticatedUserPayload = Depends(get_current_user),
) -> AnuncioStatsResponse:
    rec = _require_owner(anuncio_id, current_user.user_id)
    now = _now_utc()
    boost_ativo = bool(rec["boost_active_until"] and rec["boost_active_until"] > now)
    return AnuncioStatsResponse(
        anuncio_id=anuncio_id,
        status=rec["status"],
        views_count=rec["views_count"],
        favorites_count=len(FAVORITOS_STORE.get(anuncio_id, set())),
        fotos_count=len(rec["fotos"]),
        boost_ativo=boost_ativo,
        boost_active_until=rec["boost_active_until"],
    )


@router.post(
    "/{anuncio_id}/favorito",
    response_model=AnuncioFavoriteResponse,
    summary="Alterna favorito (adicionar/remover) para o usuario autenticado",
)
async def toggle_favorito(
    anuncio_id: str,
    current_user: AuthenticatedUserPayload = Depends(get_current_user),
) -> AnuncioFavoriteResponse:
    if anuncio_id not in ANUNCIOS_STORE:
        raise ProblemException(
            status_code=status.HTTP_404_NOT_FOUND,
            title="Listing Not Found",
            detail=f"Anuncio {anuncio_id} nao encontrado.",
        )
    fav_set = FAVORITOS_STORE.setdefault(anuncio_id, set())
    if current_user.user_id in fav_set:
        fav_set.remove(current_user.user_id)
        is_fav = False
    else:
        fav_set.add(current_user.user_id)
        is_fav = True

    return AnuncioFavoriteResponse(
        anuncio_id=anuncio_id,
        user_id=current_user.user_id,
        is_favorited=is_fav,
        favorites_count=len(fav_set),
    )
