// Production environment - dùng khi deploy lên Raspberry Pi
// HTTPS qua Caddy reverse proxy + DuckDNS DNS challenge (port 3443)
export const environment = {
  production: true,
  apiBaseUrl: 'https://ptp-phamphong-pi.duckdns.org:3443/api',
};
