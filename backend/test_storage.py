from dotenv import load_dotenv
load_dotenv()

import supabase_storage

print("SUPABASE_URL configurada:", bool(supabase_storage.SUPABASE_URL))
print("SERVICE_ROLE_KEY configurada:", bool(supabase_storage.SUPABASE_SERVICE_ROLE_KEY))

# Sube un archivo de prueba
supabase_storage.upload_bytes("test/hola.txt", b"Hola desde Alessa IPS!", "text/plain")
print("Subida exitosa.")

# Lo descarga de vuelta para confirmar
data = supabase_storage.download_bytes("test/hola.txt")
print("Contenido descargado:", data.decode("utf-8"))