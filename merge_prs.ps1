#!/usr/bin/env pwsh
# Merge PRs properly -- supports fork PRs using "gh pr checkout"
# Shows as "Merged" on GitHub, no comments left

$PRs = @(1148,1147,1146,1145,1144,1143,1099,1096,1094,1090,1088,1086,1079,818,786,782,464,427,400,357,356,355)

$succeeded = @()
$failed = @()
$skipped = @()

# Make sure we start clean on main
git checkout main 2>&1 | Out-Null
git pull origin main 2>&1 | Out-Null

foreach ($pr in $PRs) {
    Write-Host ""
    Write-Host "=============================" -ForegroundColor Cyan
    Write-Host "Processing PR #$pr" -ForegroundColor Cyan
    Write-Host "=============================" -ForegroundColor Cyan

    $prJson = gh pr view $pr --json number,title,state,mergeable,headRefName 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Could not fetch PR #$pr" -ForegroundColor Red
        $failed += "PR #" + $pr + " (fetch error)"
        continue
    }

    $prInfo = $prJson | ConvertFrom-Json
    Write-Host "Title    : $($prInfo.title)"
    Write-Host "State    : $($prInfo.state)"
    Write-Host "Mergeable: $($prInfo.mergeable)"
    Write-Host "Branch   : $($prInfo.headRefName)"

    if ($prInfo.state -ne "OPEN") {
        Write-Host "SKIP: PR #$pr is already $($prInfo.state)" -ForegroundColor Yellow
        $skipped += "PR #" + $pr + " [" + $prInfo.state + "] - " + $prInfo.title
        continue
    }

    $title = $prInfo.title

    # Step 1: Try direct gh pr merge first (works if no conflict)
    Write-Host "Attempting direct squash merge..." -ForegroundColor Green
    gh pr merge $pr --squash --delete-branch --admin 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "PR #$pr merged cleanly!" -ForegroundColor Green
        $succeeded += "PR #" + $pr + " - " + $title + " [clean squash merge]"
        git checkout main 2>&1 | Out-Null
        git pull origin main 2>&1 | Out-Null
        Start-Sleep -Seconds 1
        continue
    }

    # Step 2: Use "gh pr checkout" -- works for both fork and same-repo PRs
    Write-Host "Conflict detected -- checking out PR branch via gh pr checkout..." -ForegroundColor Yellow
    $localBranch = "pr-merge-$pr"

    # Remove local branch if it already exists
    git branch -D $localBranch 2>&1 | Out-Null

    # gh pr checkout creates a local branch tracking the PR head (even from forks)
    gh pr checkout $pr --branch $localBranch 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: gh pr checkout failed for PR #$pr" -ForegroundColor Red
        $failed += "PR #" + $pr + " - " + $title + " (gh pr checkout failed)"
        git checkout main 2>&1 | Out-Null
        continue
    }

    # Ensure we have latest main
    git fetch origin main 2>&1 | Out-Null

    # Merge main into PR branch, keeping PR changes on conflict (-X ours = current branch = PR branch wins)
    Write-Host "Merging main into PR branch (PR changes win on conflict)..." -ForegroundColor Yellow
    git merge origin/main -X ours --no-edit 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Merge failed for PR #$pr" -ForegroundColor Red
        git merge --abort 2>&1 | Out-Null
        git checkout main 2>&1 | Out-Null
        git branch -D $localBranch 2>&1 | Out-Null
        $failed += "PR #" + $pr + " - " + $title + " (merge into PR branch failed)"
        continue
    }

    # Push updated branch back (gh pr checkout sets up the right remote/tracking)
    Write-Host "Pushing updated PR branch..." -ForegroundColor Yellow
    git push 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        # Try force push in case of diverged history
        git push --force-with-lease 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "ERROR: Push failed for PR #$pr" -ForegroundColor Red
            git checkout main 2>&1 | Out-Null
            git branch -D $localBranch 2>&1 | Out-Null
            $failed += "PR #" + $pr + " - " + $title + " (push failed)"
            continue
        }
    }

    # Back to main
    git checkout main 2>&1 | Out-Null
    git branch -D $localBranch 2>&1 | Out-Null

    # Wait for GitHub to re-evaluate mergeability
    Start-Sleep -Seconds 5

    # Now merge via gh -- should be clean now, shows as "Merged" on GitHub
    Write-Host "PR branch updated -- merging via gh (shows as Merged on GitHub)..." -ForegroundColor Green
    gh pr merge $pr --squash --delete-branch --admin 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "PR #$pr MERGED!" -ForegroundColor Green
        $succeeded += "PR #" + $pr + " - " + $title + " [conflict resolved + merged]"
    } else {
        Write-Host "ERROR: gh pr merge still failed for PR #$pr" -ForegroundColor Red
        $failed += "PR #" + $pr + " - " + $title + " (gh merge failed after branch update)"
    }

    git pull origin main 2>&1 | Out-Null
    Start-Sleep -Seconds 1
}

# Final cleanup
git checkout main 2>&1 | Out-Null
git pull origin main 2>&1 | Out-Null

Write-Host ""
Write-Host "========== SUMMARY ==========" -ForegroundColor Cyan
Write-Host ""
Write-Host "SUCCEEDED ($($succeeded.Count)):" -ForegroundColor Green
foreach ($s in $succeeded) { Write-Host "  [OK] $s" -ForegroundColor Green }
Write-Host ""
Write-Host "SKIPPED ($($skipped.Count)):" -ForegroundColor Yellow
foreach ($s in $skipped) { Write-Host "  [--] $s" -ForegroundColor Yellow }
Write-Host ""
Write-Host "FAILED ($($failed.Count)):" -ForegroundColor Red
foreach ($s in $failed) { Write-Host "  [XX] $s" -ForegroundColor Red }
