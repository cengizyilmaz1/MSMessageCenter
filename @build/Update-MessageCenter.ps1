# Get the latest M365 Message Center and Microsoft 365 Roadmap items and update the site
#
# Default behavior:
# - Connects to Microsoft Graph and refreshes Message Center data.
# - Imports the Microsoft 365 Roadmap RSS feed.
#
# Use -RoadmapOnly to refresh only the Roadmap RSS feed during local development.

param($GraphSecret, [switch]$RoadmapOnly)

$SiteUrl = "https://message.cengizyilmaz.net"

function Connect-MicrosoftGraph(){
    $tenantId = $env:M365_TENANT_ID
    $clientId = $env:M365_CLIENT_ID
    $m365ConfigPath = "./@build/config-m365.json"

    if (([string]::IsNullOrWhiteSpace($tenantId) -or [string]::IsNullOrWhiteSpace($clientId)) -and (Test-Path $m365ConfigPath)) {
        $m365Config = Get-Content $m365ConfigPath | ConvertFrom-Json
        if ([string]::IsNullOrWhiteSpace($tenantId)) {
            $tenantId = $m365Config.tenantId
        }
        if ([string]::IsNullOrWhiteSpace($clientId)) {
            $clientId = $m365Config.clientId
        }
    }

    $placeholderId = "00000000-0000-0000-0000-000000000000"
    if (
        [string]::IsNullOrWhiteSpace($tenantId) -or
        [string]::IsNullOrWhiteSpace($clientId) -or
        $tenantId -eq $placeholderId -or
        $clientId -eq $placeholderId
    ) {
        throw "Set M365_TENANT_ID and M365_CLIENT_ID environment variables, or create @build/config-m365.json from config-m365.example.json."
    }

    $secret = $GraphSecret
    if([string]::IsNullOrEmpty($GraphSecret)){
        $secret = $env:GRAPH_SECRET
    }
    if([string]::IsNullOrEmpty($secret)){
        Write-Host "Graph secret not supplied; trying local @build/secrets-m365.json"
        $secret = Get-Content ./@build/secrets-m365.json | ConvertFrom-Json
    }

    [securestring]$secSecret = ConvertTo-SecureString $secret -AsPlainText -Force
    [pscredential]$cred = New-Object System.Management.Automation.PSCredential ($clientId, $secSecret)
    Write-Host "Connecting to Microsoft Graph"
    Connect-MgGraph -TenantId $tenantId -Credential $cred -NoWelcome
}
function Get-M365MessageCenterItems() {
    Write-Host "Getting Message Center items"
    $mc = Get-MgServiceAnnouncementMessage -Top 999  -Sort "LastModifiedDateTime desc" -All
    return $mc
}
function Get-RoadmapRssItems() {
    Write-Host "Getting Microsoft 365 Roadmap RSS items"
    $curlCommand = Get-Command curl -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($curlCommand) {
        $content = & $curlCommand.Source -L -s "https://www.microsoft.com/en-us/microsoft-365/RoadmapFeatureRSS"
        if ($LASTEXITCODE -ne 0) {
            throw "Unable to fetch Microsoft 365 Roadmap RSS feed."
        }
    }
    else {
        $content = (Invoke-WebRequest -Uri "https://www.microsoft.com/en-us/microsoft-365/RoadmapFeatureRSS").Content
    }

    $xmlContent = ($content -join "`n").TrimStart([char]0xFEFF)
    $rss = New-Object System.Xml.XmlDocument
    $rss.LoadXml($xmlContent)
    return $rss.rss.channel.item
}

function ConvertTo-PlainText([string]$value) {
    if ([string]::IsNullOrWhiteSpace($value)) {
        return ""
    }

    $decoded = [System.Net.WebUtility]::HtmlDecode($value)
    $decoded = $decoded -replace '<br\s*/?>', "`n"
    $decoded = $decoded -replace '</p>', "`n"
    $decoded = $decoded -replace '<[^>]+>', ''
    $decoded = $decoded -replace "`r", ''
    $lines = $decoded -split "`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ }

    return ($lines -join "`n`n")
}

function ConvertTo-RoadmapHtml([string]$value) {
    $markdown = ConvertTo-PlainText $value
    $lines = $markdown -split "`n`n"
    $htmlParts = New-Object System.Collections.Generic.List[string]

    foreach ($line in $lines) {
        $escaped = [System.Net.WebUtility]::HtmlEncode($line)
        if ($line -match '^(GA date|Preview date|More info):\s*(.+)$') {
            $label = [System.Net.WebUtility]::HtmlEncode($matches[1])
            $content = [System.Net.WebUtility]::HtmlEncode($matches[2])
            $htmlParts.Add("<p><b>${label}:</b> $content</p>")
        }
        else {
            $htmlParts.Add("<p>$escaped</p>")
        }
    }

    return ($htmlParts -join "`n")
}

function Join-CategoryValues([array]$values) {
    return (($values | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Sort-Object -Unique) -join ", ")
}

function ConvertTo-RoadmapMessage($item) {
    $categories = @($item.category | ForEach-Object { [string]$_ })
    $statusValues = @("In development", "Rolling out", "Launched", "Cancelled", "Postponed", "Modified")
    $releaseValues = @("General Availability", "Preview", "Targeted Release", "Current Channel", "Monthly Enterprise Channel", "Semi-Annual Enterprise Channel")
    $cloudValues = @("Worldwide (Standard Multi-Tenant)", "GCC", "GCC High", "DoD")
    $platformValues = @("Android", "Desktop", "iOS", "Linux", "Mac", "Teams and Surface Devices", "Web")

    $status = @($categories | Where-Object { $statusValues -contains $_ })
    $release = @($categories | Where-Object { $releaseValues -contains $_ })
    $clouds = @($categories | Where-Object { $cloudValues -contains $_ })
    $platforms = @($categories | Where-Object { $platformValues -contains $_ })
    $services = @($categories | Where-Object {
        ($statusValues -notcontains $_) -and
        ($releaseValues -notcontains $_) -and
        ($cloudValues -notcontains $_) -and
        ($platformValues -notcontains $_)
    })

    $sourceId = [string]$item.guid.'#text'
    if ([string]::IsNullOrWhiteSpace($sourceId)) {
        $sourceId = [string]$item.guid
    }

    $description = [string]$item.description
    $markdown = ConvertTo-PlainText $description
    $html = ConvertTo-RoadmapHtml $description
    $pubDate = ([datetimeoffset]::Parse([string]$item.pubDate)).UtcDateTime.ToString("o")
    $updatedNode = $item.SelectSingleNode("*[local-name()='updated']")
    $updated = if ($updatedNode) { ([datetimeoffset]::Parse($updatedNode.InnerText)).UtcDateTime.ToString("o") } else { $pubDate }
    $link = [string]$item.link

    return [pscustomobject]@{
        ActionRequiredByDateTime = $null
        Attachments = $null
        AttachmentsArchive = $null
        Body = [pscustomobject]@{
            Content = $html
            ContentType = "html"
            Markdown = $markdown
        }
        Category = "roadmap"
        Details = @(
            [pscustomobject]@{ Name = "RoadmapIds"; Value = $sourceId },
            [pscustomobject]@{ Name = "SourceId"; Value = $sourceId },
            [pscustomobject]@{ Name = "RoadmapLink"; Value = $link },
            [pscustomobject]@{ Name = "Summary"; Value = (($markdown -split "`n`n")[0]) },
            [pscustomobject]@{ Name = "Status"; Value = (Join-CategoryValues $status) },
            [pscustomobject]@{ Name = "ReleasePhase"; Value = (Join-CategoryValues $release) },
            [pscustomobject]@{ Name = "CloudInstances"; Value = (Join-CategoryValues $clouds) },
            [pscustomobject]@{ Name = "Platforms"; Value = (Join-CategoryValues $platforms) }
        )
        EndDateTime = $null
        HasAttachments = $false
        Id = "RM$sourceId"
        IsMajorChange = $false
        LastModifiedDateTime = $updated
        Services = @($services)
        Severity = "normal"
        Source = "roadmap"
        StartDateTime = $pubDate
        Tags = @($status + $release + $clouds)
        Title = ([string]$item.title).Trim()
        ViewPoint = [pscustomobject]@{
            IsArchived = $null
            IsFavorited = $null
            IsRead = $null
        }
        AdditionalProperties = [pscustomobject]@{}
    }
}

$dataPath = "./@data"

if(-not $RoadmapOnly){
    Connect-MicrosoftGraph
    $msgItems = Get-M365MessageCenterItems

    Write-Host "Updating Message Center data with $($msgItems.Count) items"
    foreach($msg in $msgItems){
        $msg.Title = $msg.Title.Replace('(Updated) ', '')
        $msg.body.content = $msg.body.content -replace '\[(.*?)\]', '<b>$1</b>'
        $msg | Add-Member -NotePropertyName Source -NotePropertyValue "messageCenter" -Force

        # Save each message for version history
        $msg | ConvertTo-Json -Depth 10 | Set-Content -Path ("$($dataPath)/archive/$($msg.Id).json")
    }

    $msgitems | ConvertTo-Json -Depth 10 | Set-Content -Path ($dataPath + "/messages.json")
    $msgitems.Services | Sort-Object | Get-Unique | ConvertTo-Json | Set-Content -Path ($dataPath + "/services.json")
}
else {
    Write-Host "Skipping Message Center update because -RoadmapOnly was supplied"
}

$roadmapItems = Get-RoadmapRssItems | ForEach-Object { ConvertTo-RoadmapMessage $_ }
Write-Host "Updating roadmap data with $($roadmapItems.Count) items"
$roadmapItems | ConvertTo-Json -Depth 10 | Set-Content -Path ($dataPath + "/roadmap.json")

Write-Host "Building messages-archive.json from archive folder"
$activeMessages = Get-Content ($dataPath + "/messages.json") | ConvertFrom-Json
$activeIds = $activeMessages | Select-Object -ExpandProperty Id
$archiveFields = @('Id','Title','Services','StartDateTime','EndDateTime','LastModifiedDateTime','IsMajorChange','Category')
$archiveRecords = @(Get-ChildItem -Path "$($dataPath)/archive" -Filter "*.json" |
    Where-Object { $activeIds -notcontains $_.BaseName } |
    ForEach-Object {
        $item = Get-Content $_.FullName | ConvertFrom-Json
        $record = [ordered]@{}

        foreach ($field in $archiveFields) {
            $record[$field] = $item.$field
        }

        $record
    } |
    Sort-Object -Property LastModifiedDateTime -Descending)

ConvertTo-Json -InputObject $archiveRecords -Depth 5 -Compress | Set-Content -Path ($dataPath + "/messages-archive.json")
Copy-Item -Path ($dataPath + "/messages-archive.json") -Destination "./public/messages-archive.json" -Force
Write-Host "Wrote $($archiveRecords.Count) archive-only records to messages-archive.json"

$tableServices = @($activeMessages.Services + $roadmapItems.Services + $archiveRecords.Services) |
    Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
    Sort-Object -Unique
ConvertTo-Json -InputObject $tableServices -Depth 3 -Compress | Set-Content -Path ($dataPath + "/table-services.json")
Write-Host "Wrote $($tableServices.Count) table services to table-services.json"

Write-Host "Building messages-index.json and rss.xml"
$env:SITE_URL = $SiteUrl
node ./scripts/build-public-feeds.mjs

Write-Host "Augmenting messages-index.json with cross-message references"
node ./scripts/build-references.mjs

Write-Host "Updating per-message version history under @data/history"
node ./scripts/update-history.mjs

Write-Host "Completed updating"
