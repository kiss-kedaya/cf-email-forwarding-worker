## Cf email forwarding worker

用于将 Worker 接收的邮件转发到第三方 APP

参考文档：https://apil.top/docs/developer/cloudflare-email-worker

### Deploy email worker to cloudflare

```bash
git clone https://github.com/kiss-kedaya/cf-email-forwarding-worker.git
cd cf-email-forwarding-worker
pnpm install
 
wrangler login 
wrangler deploy
```
