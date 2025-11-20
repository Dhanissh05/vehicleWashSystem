# Create placeholder PNG images for Expo apps

# Function to create a simple PNG file
function Create-PlaceholderImage {
    param (
        [string]$Path,
        [int]$Width = 1024,
        [int]$Height = 1024
    )
    
    # Base64 encoded 1x1 transparent PNG
    $base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    
    $bytes = [Convert]::FromBase64String($base64)
    [System.IO.File]::WriteAllBytes($Path, $bytes)
    Write-Host "Created: $Path"
}

# Create assets for company-app
$companyAssets = "company-app\assets"
if (!(Test-Path $companyAssets)) {
    New-Item -ItemType Directory -Path $companyAssets -Force | Out-Null
}

Create-PlaceholderImage -Path "$companyAssets\icon.png"
Create-PlaceholderImage -Path "$companyAssets\splash.png"
Create-PlaceholderImage -Path "$companyAssets\adaptive-icon.png"
Create-PlaceholderImage -Path "$companyAssets\favicon.png"

Write-Host "`nAsset placeholders created successfully!"
