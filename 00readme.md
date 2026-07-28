**into VSC console for flask run**
para dirigirse a la carpeta E
cd /d "E:\Nueva carpeta\AlessaIPS v01" ---> si se usa cmd

cd "E:\Nueva carpeta\AlessaIPS v01" ----> si se usa la termianl de VSC

para inciar flask
E:\Nueva carpeta\AlessaIPS v01> py backend/app.py

**instalar bibliotecas (siempre que se desconfigure)**
py -m pip install flask flask-cors biopython

**Python selector**
El entorno de desarrollo de VS Code,  no siempre apuntando al mismo intérprete de Python donde instalaste los paquetes. para ello

Presiona Ctrl + Shift + P (o F1) para abrir la paleta de comandos.

Escribe: Python: Select Interpreter

Verás una lista de versiones de Python. Selecciona la que diga Python 3.13.2, y asegúrate que el path sea algo similar a:

C:\Users\TuUsuario\AppData\Local\Programs\Python\Python313\python.exe
