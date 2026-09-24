#!/bin/zsh
# telefonu mac'te göster ve expo'yu kablo üzerinden bağla.
#   1) telefonda geliştirici seçenekleri → usb hata ayıklama açık
#   2) usb kablosu takılı
#   3) ./tools/phone.sh
S="$HOME/Applications/scrcpy"
PORT="${1:-8082}"
"$S/adb" start-server >/dev/null 2>&1
if ! "$S/adb" devices | grep -q "device$"; then
  echo "telefon görünmüyor. kabloyu tak, telefonda 'usb hata ayıklamaya izin ver' kutusunu onayla."
  "$S/adb" devices
  exit 1
fi
# expo go, sunucuya wi-fi yerine kablo üzerinden ulaşır: telefonun localhost:PORT'u = mac'in PORT'u
"$S/adb" reverse "tcp:$PORT" "tcp:$PORT" && echo "kablo bağlantısı hazır: exp://localhost:$PORT"
exec "$S/scrcpy" --window-title afterhours --max-size 1080 --stay-awake
