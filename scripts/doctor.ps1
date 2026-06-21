$base = "http://127.0.0.1:4010"
$key = "dev-author-local"
Write-Host "Checking Author Services at $base ..."
try {
  $health = Invoke-RestMethod -Uri "$base/author/v1/health" -Method Get
  Write-Host "Health: OK ($($health.service))"
} catch {
  Write-Host "Health: FAIL — start author-services (pnpm dev in author-services repo)"
  exit 1
}
try {
  $headers = @{ "X-API-Key" = $key }
  $kit = Invoke-RestMethod -Uri "$base/author/v1/kit" -Method Get -Headers $headers
  Write-Host "Kit: OK (version $($kit.kitVersion), projectors: $($kit.projectors.Count))"
} catch {
  Write-Host "Kit: FAIL — check API key and AUTHOR_SERVICES_DEV_MODE"
  exit 1
}
Write-Host "Author Services ready for offline authoring."
