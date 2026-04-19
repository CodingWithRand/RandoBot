@echo off
:: Wait 10 seconds to ensure the internet is connected
timeout /t 10 /nobreak > NUL
pm2 resurrect