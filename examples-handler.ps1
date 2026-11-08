# Windows 用の例: 第1引数で value を受け取る(標準入力モードなら $input を読む)
param([string]$Value)
Start-Process $Value
