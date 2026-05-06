$VPS_IP = "109.120.134.188"
$VPS_USER = "admin"
$REMOTE_DIR = "/opt/claytablet"
$LOCAL_DIR = "./"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " Deploying ClayTablet to VPS ($VPS_IP)" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

Write-Host "Syncing files..." -ForegroundColor Yellow
# Using scp fallback as rsync might be missing on Windows host
scp -P 2202 -i $HOME/.ssh/id_rsa -r ./* ${VPS_USER}@${VPS_IP}:${REMOTE_DIR}

Write-Host "Restarting Docker containers on VPS..." -ForegroundColor Yellow
ssh -p 2202 -i $HOME/.ssh/id_rsa -o StrictHostKeyChecking=no ${VPS_USER}@${VPS_IP} "cd $REMOTE_DIR && docker compose up -d --build"

Write-Host "Done!" -ForegroundColor Green
Write-Host "Frontend: https://claytablet.online" -ForegroundColor Green
Write-Host "Backend:  http://${VPS_IP}:8555" -ForegroundColor Green
