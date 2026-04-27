# RealDiag Website

This repository hosts the public landing page for [RealDiag](https://realdiag.com).

## Deployment

The site is published using **GitHub Pages**.

### Steps to deploy:
1. Push this repo to GitHub.
2. Go to **Settings → Pages**.
3. Under "Source," select the **main branch** and root (`/`) folder.
4. Save, and GitHub will publish your site at:
   - https://<your-username>.github.io/realdiag-website
   - You can point your domain **realdiag.com** to this by adding a DNS `CNAME` record.

### Custom Domain Setup
- In your repo, add a file called `CNAME` with this inside:
  ```
  www.realdiag.com
  ```
- Update your domain registrar to point to GitHub’s Pages IP addresses:
  ```
  185.199.108.153
  185.199.109.153
  185.199.110.153
  185.199.111.153
  ```

Once DNS propagates, **realdiag.com** will display this site 🎉
