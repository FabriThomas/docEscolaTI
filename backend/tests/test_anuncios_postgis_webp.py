"""
E2E & Unit Tests for EDTS-373 (SPRINT13_006):
- CRUD Anuncios (Criar, Editar, Pausar, Reativar, Excluir)
- Upload & Sanitizacao Pillow WebP <= 300 KB sem EXIF (max 6 fotos)
- Paginacao por Cursor + Prioridade Boost
- Busca Avancada + Filtro de Raio PostGIS
- Favoritos, Estatisticas e Comparador de Especificacoes
"""

import io
from fastapi.testclient import TestClient
from PIL import Image

from app.core.security import create_access_token
from app.main import app

client = TestClient(app)


def _auth(user_id: str) -> dict:
    token = create_access_token(
        user_id=user_id,
        email=f"{user_id}@steely.local",
        role="USER",
        kyc_verified=True,
        trust_score=95.0,
    )
    return {"Authorization": f"Bearer {token}"}


def _make_jpeg_with_exif() -> bytes:
    img = Image.new("RGB", (800, 600), color=(29, 219, 106))
    exif = Image.Exif()
    exif[271] = "CameraTeste"  # Make
    exif[34853] = {2: (23.0, 25.0, 0.0)}  # GPSInfo tag
    buf = io.BytesIO()
    img.save(buf, format="JPEG", exif=exif)
    return buf.getvalue()


def test_crud_pausar_boost_e_estatisticas():
    # 1. Create listing (Maringa PR)
    r_create = client.post(
        "/api/v1/anuncios/",
        headers=_auth("seller-edts373"),
        json={
            "titulo": "RTX 3060 Ti ASUS Dual 8GB",
            "descricao": "Placa em otimo estado",
            "categoria": "gpu",
            "marca": "ASUS",
            "modelo_ou_sku": "DUAL-RTX3060TI-O8G",
            "condicao": "SEMINOVO",
            "preco_centavos": 175000,
            "bairro_aproximado": "Zona 7",
            "cidade": "Maringa",
            "estado": "PR",
            "latitude": -23.4075,
            "longitude": -51.9389,
            "specs": {"VRAM": "8GB GDDR6", "TDP": "200W"},
        },
    )
    assert r_create.status_code == 201
    aid = r_create.json()["id"]

    # 2. Edit price
    r_edit = client.patch(
        f"/api/v1/anuncios/{aid}",
        headers=_auth("seller-edts373"),
        json={"preco_centavos": 169000},
    )
    assert r_edit.status_code == 200
    assert r_edit.json()["preco_centavos"] == 169000

    # 3. Pause & Reactivate
    assert client.post(f"/api/v1/anuncios/{aid}/pausar", headers=_auth("seller-edts373")).json()["status"] == "PAUSADA"
    assert client.post(f"/api/v1/anuncios/{aid}/reativar", headers=_auth("seller-edts373")).json()["status"] == "ATIVA"

    # 4. View + Favorite + Boost + Stats
    assert client.get(f"/api/v1/anuncios/{aid}").status_code == 200
    r_fav = client.post(f"/api/v1/anuncios/{aid}/favorito", headers=_auth("buyer-fav-1"))
    assert r_fav.status_code == 200
    assert r_fav.json()["is_favorited"] is True

    r_boost = client.post(
        f"/api/v1/anuncios/{aid}/boost",
        headers=_auth("seller-edts373"),
        json={"duracao_horas": 48, "moedas_custo": 30},
    )
    assert r_boost.status_code == 200
    assert r_boost.json()["status"] == "BOOST_ATIVO"

    r_stats = client.get(f"/api/v1/anuncios/{aid}/estatisticas", headers=_auth("seller-edts373"))
    assert r_stats.status_code == 200
    stats = r_stats.json()
    assert stats["views_count"] == 1
    assert stats["favorites_count"] == 1
    assert stats["boost_ativo"] is True


def test_upload_fotos_webp_sem_exif_limite_6():
    r_create = client.post(
        "/api/v1/anuncios/",
        headers=_auth("seller-photo"),
        json={
            "titulo": "Ryzen 5 5600X AM4",
            "categoria": "cpu",
            "condicao": "USADO",
            "preco_centavos": 65000,
            "cidade": "Maringa",
            "estado": "PR",
            "latitude": -23.42,
            "longitude": -51.93,
        },
    )
    aid = r_create.json()["id"]
    jpeg_with_exif = _make_jpeg_with_exif()

    # Upload 2 photos -> converted to WebP <= 300 KB with EXIF stripped
    files = [
        ("files", ("foto1.jpg", jpeg_with_exif, "image/jpeg")),
        ("files", ("foto2.jpg", jpeg_with_exif, "image/jpeg")),
    ]
    r_up = client.post(f"/api/v1/anuncios/{aid}/fotos", headers=_auth("seller-photo"), files=files)
    assert r_up.status_code == 200
    photos = r_up.json()
    assert len(photos) == 2
    assert all(p["format"] == "WEBP" and p["exif_stripped"] is True and p["size_bytes"] <= 300 * 1024 for p in photos)

    # Attempt 5 more photos (2 + 5 = 7 > 6) -> rejected 422
    files_5 = [("files", (f"f{i}.jpg", jpeg_with_exif, "image/jpeg")) for i in range(5)]
    r_over = client.post(f"/api/v1/anuncios/{aid}/fotos", headers=_auth("seller-photo"), files=files_5)
    assert r_over.status_code == 422


def test_cursor_pagination_busca_postgis_e_comparador():
    # Create 2 listings in different cities: Maringa (-23.42, -51.93) and Curitiba (-25.42, -49.27)
    r1 = client.post(
        "/api/v1/anuncios/",
        headers=_auth("seller-geo"),
        json={
            "titulo": "Placa Mae B550M Maringa",
            "categoria": "motherboard",
            "condicao": "SEMINOVO",
            "preco_centavos": 55000,
            "cidade": "Maringa",
            "estado": "PR",
            "latitude": -23.42,
            "longitude": -51.93,
            "specs": {"Socket": "AM4", "Chipset": "B550"},
        },
    )
    r2 = client.post(
        "/api/v1/anuncios/",
        headers=_auth("seller-geo"),
        json={
            "titulo": "Placa Mae X570 Curitiba",
            "categoria": "motherboard",
            "condicao": "USADO",
            "preco_centavos": 89000,
            "cidade": "Curitiba",
            "estado": "PR",
            "latitude": -25.42,
            "longitude": -49.27,
            "specs": {"Socket": "AM4", "Chipset": "X570"},
        },
    )
    id1, id2 = r1.json()["id"], r2.json()["id"]

    # Cursor pagination with limit=1
    p1 = client.get("/api/v1/anuncios/?limit=1").json()
    assert len(p1["items"]) == 1
    assert p1["has_more"] is True
    assert p1["next_cursor"] is not None

    p2 = client.get(f"/api/v1/anuncios/?limit=1&cursor={p1['next_cursor']}").json()
    assert len(p2["items"]) == 1
    assert p2["items"][0]["id"] != p1["items"][0]["id"]

    # Geo-radius search around Maringa (25 km) -> must include id1 and exclude Curitiba (id2)
    r_geo = client.get("/api/v1/anuncios/busca?lat=-23.42&lon=-51.93&raio_km=25&categoria=motherboard")
    assert r_geo.status_code == 200
    geo_ids = [item["id"] for item in r_geo.json()]
    assert id1 in geo_ids
    assert id2 not in geo_ids

    # Comparator side-by-side
    r_comp = client.get(f"/api/v1/anuncios/comparador?ids={id1},{id2}")
    assert r_comp.status_code == 200
    comp = r_comp.json()
    assert comp["total_comparados"] == 2
    assert comp["specs_matrix"]["Chipset"][id1] == "B550"
    assert comp["specs_matrix"]["Chipset"][id2] == "X570"
