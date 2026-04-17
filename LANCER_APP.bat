@echo off
title FridAI - Expo
color 0A
echo.
echo  ========================================
echo    FridAI - Lancement de l'app mobile
echo  ========================================
echo.
echo  Demarrage du serveur Expo...
echo  Un QR code va apparaitre ci-dessous.
echo  Scannez-le avec l'app Expo Go sur iPhone.
echo.
echo  (Votre iPhone doit etre sur le meme WiFi)
echo.
pause
cd /d C:\Users\Administrator\BRAIN\Fridgeai\mobile
npx expo start
pause
