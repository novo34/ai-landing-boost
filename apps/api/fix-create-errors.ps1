# Script para corregir errores de creación en Prisma
# Agrega id y updatedAt donde falten

$files = Get-ChildItem -Path "apps/api/src" -Recurse -Filter "*.ts" | Where-Object { $_.FullName -notmatch "node_modules|dist" }
$scripts = Get-ChildItem -Path "apps/api/scripts" -Recurse -Filter "*.ts" | Where-Object { $_.FullName -notmatch "node_modules|dist" }
$allFiles = $files + $scripts

Write-Host "Corrigiendo errores de creación en $($allFiles.Count) archivos..." -ForegroundColor Cyan

$totalReplacements = 0
foreach ($file in $allFiles) {
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
    $fileReplacements = 0
    
    # Agregar import de crypto si no existe y se necesita
    if ($content -match "\.user\.create\(|\.tenant\.create\(|\.appointment\.create\(|\.message\.create\(") {
        if ($content -notmatch "import.*crypto|from 'crypto'") {
            # Agregar import después de otros imports
            if ($content -match "(import.*from '@prisma/client';)") {
                $content = $content -replace "(import.*from '@prisma/client';)", "`$1`nimport { randomUUID } from 'crypto';"
                $fileReplacements++
            }
            elseif ($content -match "(import.*from '@nestjs/common';)") {
                $content = $content -replace "(import.*from '@nestjs/common';)", "`$1`nimport { randomUUID } from 'crypto';"
                $fileReplacements++
            }
        }
    }
    
    # Corregir creates de user que no tienen id ni updatedAt
    $content = $content -replace "(tx\.user\.create\(\s*\{[\s\S]*?data:\s*\{)([\s\S]*?)(\s*\},)", {
        $before = $matches[1]
        $data = $matches[2]
        $after = $matches[3]
        
        if ($data -notmatch "id:") {
            $data = "`n          id: randomUUID(),$data"
            $fileReplacements++
        }
        if ($data -notmatch "updatedAt:") {
            $data = "$data`n          updatedAt: new Date(),"
            $fileReplacements++
        }
        "$before$data$after"
    }
    
    # Corregir creates de tenant que no tienen id ni updatedAt
    $content = $content -replace "(tx\.tenant\.create\(\s*\{[\s\S]*?data:\s*\{)([\s\S]*?)(\s*\},)", {
        $before = $matches[1]
        $data = $matches[2]
        $after = $matches[3]
        
        if ($data -notmatch "id:") {
            $data = "`n          id: randomUUID(),$data"
            $fileReplacements++
        }
        if ($data -notmatch "updatedAt:") {
            $data = "$data`n          updatedAt: new Date(),"
            $fileReplacements++
        }
        "$before$data$after"
    }
    
    # Corregir creates de appointment que no tienen id ni updatedAt
    $content = $content -replace "(prisma\.appointment\.create\(\s*\{[\s\S]*?data:\s*\{)([\s\S]*?)(\s*\},)", {
        $before = $matches[1]
        $data = $matches[2]
        $after = $matches[3]
        
        if ($data -notmatch "id:") {
            $data = "`n          id: randomUUID(),$data"
            $fileReplacements++
        }
        if ($data -notmatch "updatedAt:") {
            $data = "$data`n          updatedAt: new Date(),"
            $fileReplacements++
        }
        "$before$data$after"
    }
    
    # Corregir creates de message que no tienen id ni updatedAt
    $content = $content -replace "(prisma\.message\.create\(\s*\{[\s\S]*?data:\s*\{)([\s\S]*?)(\s*\},)", {
        $before = $matches[1]
        $data = $matches[2]
        $after = $matches[3]
        
        if ($data -notmatch "id:") {
            $data = "`n          id: randomUUID(),$data"
            $fileReplacements++
        }
        if ($data -notmatch "updatedAt:") {
            $data = "$data`n          updatedAt: new Date(),"
            $fileReplacements++
        }
        "$before$data$after"
    }
    
    if ($content -ne $originalContent) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "✅ $($file.Name): $fileReplacements reemplazos" -ForegroundColor Green
        $totalReplacements += $fileReplacements
    }
}

Write-Host "`n✅ Total: $totalReplacements reemplazos" -ForegroundColor Cyan

