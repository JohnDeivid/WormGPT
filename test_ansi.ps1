[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$path = 'c:\Users\User Name\Downloads\WormGPT--main\tuil.txt'
$content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
[Console]::Write($content)
