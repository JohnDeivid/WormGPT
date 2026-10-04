$e = [char]27

$logo = hola
    "",
    "Welcome to WormGPT CLI.",
    "",
    "Autonomous reasoning environment initialized.",
    "Terminal systems online.",
    "",
    "Ready for input.",
    "",
    "[Use arrow keys to navigate, Enter to select]"
)

$content = $logo -join "`n"

[System.IO.File]::WriteAllText(
    'c:\Users\User Name\Downloads\WormGPT--main\tuil.txt',
    $content,
    [System.Text.Encoding]::UTF8
)
[System.IO.File]::WriteAllText(
    'c:\Users\User Name\Downloads\WormGPT--main\WormGPT--main\WormgptWindows\wormgpt_enhanced\app\public\tuil.txt',
    $content,
    [System.Text.Encoding]::UTF8
)

Write-Host "Archivos escritos con ANSI real. Verificando:"
Get-Content 'c:\Users\User Name\Downloads\WormGPT--main\tuil.txt' -Raw | Write-Host
