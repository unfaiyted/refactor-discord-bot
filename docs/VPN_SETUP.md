# VPN Setup for YouTube API Access

## Overview

The Discord bot uses Gluetun VPN to route traffic through Surfshark's WireGuard network. This bypasses YouTube's IP-based blocking that prevents the bot from extracting video metadata.

## Current Configuration

- **VPN Provider**: Surfshark
- **Protocol**: WireGuard
- **Server Location**: Amsterdam, Netherlands
- **IP Address**: 89.46.223.188 (as of 2026-01-17)

## Why VPN is Needed

YouTube blocks requests from datacenter IPs (like VPS servers). When the bot tried to extract video metadata:

- **Without VPN**: Returns empty data (only like_count)
- **With VPN**: Returns full metadata (title, author, duration, views, thumbnail)

## How It Works

1. **Gluetun container** establishes VPN connection to Surfshark Amsterdam server
2. **Bot container** uses `network_mode: "service:gluetun"` to route all traffic through VPN
3. **YouTube sees** the Amsterdam residential IP instead of the VPS datacenter IP
4. **All traffic** (YouTube API, Discord API, database) routes through the VPN tunnel
5. **Killswitch** automatically blocks traffic if VPN disconnects

## Environment Variables

Required in `.env`:

```bash
SURFSHARK_PRIVATE_KEY=<your_wireguard_private_key>
SURFSHARK_ADDRESSES=10.14.0.2/16
VPN_SERVER_COUNTRIES=Netherlands
VPN_SERVER_CITIES=Amsterdam
```

## Changing VPN Server Location

To use a different Surfshark server:

1. **Get WireGuard config** from Surfshark account:
   - Log into Surfshark
   - Go to: VPN → Manual Setup → WireGuard
   - Download config for desired location

2. **Update environment variables**:

   ```bash
   # Edit .env on VPS
   VPN_SERVER_COUNTRIES=<country>
   VPN_SERVER_CITIES=<city>
   ```

3. **Restart Gluetun**:
   ```bash
   docker compose restart gluetun
   docker compose restart bot
   ```

## Monitoring VPN Connection

### Check current IP:

```bash
docker compose logs gluetun | grep "Public IP address"
```

### Test from bot container:

```bash
docker run --rm --network=container:gluetun alpine:3.22 sh -c "apk add curl && curl ifconfig.io"
```

### Check health status:

```bash
docker compose ps
# Should show (healthy) next to gluetun
```

### Test YouTube extraction:

```bash
docker compose exec bot bun src/scripts/test-youtube.ts
```

## Known Working Servers

- ✅ **Amsterdam, Netherlands** - Successfully bypasses YouTube blocking
- ❌ **Dallas, USA** - Blocked by YouTube (datacenter IP range)

## Troubleshooting

### VPN won't connect

```bash
# Check Gluetun logs
docker compose logs gluetun

# Verify credentials in .env
cat .env | grep SURFSHARK
```

### Bot can't reach Postgres

```bash
# Ensure firewall allows local subnets
# Check docker-compose.yml has:
# FIREWALL_OUTBOUND_SUBNETS=172.16.0.0/12,192.168.0.0/16
```

### YouTube still blocked

Try different server location - some VPN IPs may be on YouTube's blocklist.

## Performance Impact

- **Latency**: +50-100ms depending on VPN server distance
- **Bandwidth**: Minimal impact (YouTube API responses are small)
- **Reliability**: Auto-reconnects if VPN drops

## Security Notes

- VPN credentials stored in `.env` (gitignored)
- Killswitch prevents IP leaks if VPN disconnects
- All bot traffic encrypted through VPN tunnel
- Database connections remain on local Docker network
