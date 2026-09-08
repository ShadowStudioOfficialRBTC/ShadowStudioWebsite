@echo off
set "PYTHON=C:\Users\ADITYA\AppData\Local\Programs\Python\Python312\python.exe"
if not exist "%PYTHON%" (
    echo Python 3.12 was not found at %PYTHON%
    exit /b 1
)
"%PYTHON%" "%~dp0model_server.py"