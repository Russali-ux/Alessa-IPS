"""
Helper para subir/descargar archivos al bucket privado de Supabase Storage
('ips-documents') usando la API REST directamente (sin el SDK completo de
Supabase, ya que 'requests' ya es una dependencia del proyecto).

Requiere las variables de entorno:
  - SUPABASE_URL                (ej. https://ngfooohbehmgtzlkbkoa.supabase.co)
  - SUPABASE_SERVICE_ROLE_KEY   (clave secreta, NUNCA la 'anon'/pública)

La service_role key bypassea RLS, así que el backend tiene acceso total
al bucket sin necesitar políticas adicionales.
"""
import os
import mimetypes
import requests

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
BUCKET = "ips-documents"


def _headers(content_type=None):
    headers = {
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
    }
    if content_type:
        headers["Content-Type"] = content_type
    return headers


def _check_configured():
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError(
            "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no están configuradas "
            "en las variables de entorno del backend."
        )


def upload_bytes(storage_path: str, data: bytes, content_type: str = None):
    """Sube contenido binario a storage_path dentro del bucket. Sobreescribe si ya existe."""
    _check_configured()
    content_type = content_type or mimetypes.guess_type(storage_path)[0] or "application/octet-stream"
    url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{storage_path}"
    resp = requests.post(
        url,
        headers={**_headers(content_type), "x-upsert": "true"},
        data=data,
    )
    if resp.status_code not in (200, 201):
        raise RuntimeError(f"Error subiendo a Supabase Storage ({storage_path}): {resp.status_code} {resp.text}")
    return storage_path


def upload_file(local_path: str, storage_path: str):
    """Lee un archivo local y lo sube a storage_path dentro del bucket."""
    with open(local_path, "rb") as f:
        data = f.read()
    return upload_bytes(storage_path, data)


def download_bytes(storage_path: str) -> bytes:
    """Descarga el contenido binario de storage_path dentro del bucket."""
    _check_configured()
    url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{storage_path}"
    resp = requests.get(url, headers=_headers())
    if resp.status_code != 200:
        raise RuntimeError(f"Error descargando de Supabase Storage ({storage_path}): {resp.status_code} {resp.text}")
    return resp.content


def delete_object(storage_path: str):
    _check_configured()
    url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{storage_path}"
    resp = requests.delete(url, headers=_headers())
    return resp.status_code in (200, 204)
