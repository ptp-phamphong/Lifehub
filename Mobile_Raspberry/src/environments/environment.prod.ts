// Production environment - dùng khi deploy lên Raspberry Pi
// HTTPS qua Caddy reverse proxy, cert wildcard cấp bằng DNS-01 Cloudflare (port 443).
export const environment = {
  production: true,
  apiBaseUrl: 'https://app.ptp-phamphong.com/api',
};
