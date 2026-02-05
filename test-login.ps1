# Test login Edge Function
# Pakeiskite email ir password į savo

$body = @{
    email = "test@test.lt"
    password = "test123456"
} | ConvertTo-Json

$response = Invoke-WebRequest `
    -Uri "https://xyzttzqvbescdpihvyfu.supabase.co/functions/v1/darbuotojai-login" `
    -Method POST `
    -Body $body `
    -ContentType "application/json" `
    -UseBasicParsing

Write-Host "Status Code: $($response.StatusCode)"
Write-Host "Response Body:"
$response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
