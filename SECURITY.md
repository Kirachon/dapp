# Security Guidelines

## LoveConnect Dating App - Security Best Practices

**Last Updated:** September 12, 2025
**Security Status:** ✅ Repository Secured
**Critical Issues:** 🟢 None (Previously resolved)

---

## 🚨 **RECENT SECURITY FIXES**

### **Environment Files Removed (CRITICAL)**

- **Issue:** `.env` and `.env.docker` files were committed with sensitive credentials
- **Credentials Exposed:**
  - `POSTGRES_PASSWORD=app`
  - `MINIO_ROOT_PASSWORD=minio123`
  - Database connection strings with embedded passwords
- **Resolution:** Files removed from git tracking, enhanced .gitignore patterns
- **Status:** ✅ **RESOLVED** - No sensitive data in repository

---

## ✅ SECURITY FIXES (2025-09-12)

- Mock Authentication Production Guard: Mock auth is now hard-disabled in production. Server startup throws if ALLOW_MOCK_AUTH=true with NODE_ENV=production
- GraphQL Complexity Enforcement: Server rejects over-complex GraphQL queries with 429 and logs security telemetry
- GraphQL Depth Limiting (Defense-in-Depth): Requests with depth > GRAPHQL_MAX_DEPTH are rejected with 429 and security logging
- Admin IP Allowlist Hardening: Deny-by-default in production when ADMIN_IP_WHITELIST is empty/missing; allow when client IP is whitelisted; allow in development for DX
- Raw SQL Parameterization: Replaced prisma.$queryRawUnsafe with parameterized prisma.$queryRaw tagged templates in discovery resolver
- Frontend CSP Headers: Next.js sends strict CSP (prod) with optional report-only for dev; backend /csp-report endpoint receives violation reports
- CI Guard for Env Files: Workflow fails on committed .env\* (except .env.example)
- Sanitized .env.example: Safe dev-only placeholders and documented security configuration
- Environment Files: .env.docker removed from tracking; added .env.example; ensure .gitignore prevents env files in git; rotate any previously exposed secrets

---

## 🔒 **SECURITY MEASURES IMPLEMENTED**

### **1. Environment Variable Security**

```bash
# ✅ SECURE: Files properly ignored
.env                    # Local development environment
.env.docker            # Docker development environment
.env.production        # Production environment (never commit!)
.env.staging           # Staging environment (never commit!)

# ✅ SAFE: Template file for developers
.env.example           # Template with example values (safe to commit)
```

### **2. Comprehensive .gitignore Patterns**

```bash
# Environment files
.env.*
!.env.example

# Private keys and certificates
*.key, *.pem, *.p12, *.jks, *.keystore, *.crt, *.cert, *.pfx

# API keys and tokens
*api-key*, *secret*, *token*, *credentials*
.auth, auth.json, service-account*.json

# Database dumps and backups
*.dump, *.backup, *.bak, *.sql.gz, *.db.backup

# Local configuration files
config.local.*, settings.local.*, local.config.*
.vscode/settings.json, .idea/
```

### **3. Development Credentials Policy**

## ⚙️ Configuration: Security Controls

### Environment Variables

- GRAPHQL_MAX_COMPLEXITY: number (default 300) — Maximum allowed complexity; requests exceeding are rejected with 429
- GRAPHQL_MAX_DEPTH: number (default 10) — Maximum allowed query depth; requests exceeding are rejected with 429
- ADMIN_IP_WHITELIST: comma-separated list of IPs (e.g., 127.0.0.1,10.0.0.5) — Admin endpoints allow only these IPs in production; deny-by-default when empty
- CSP_REPORT_ONLY: boolean (default false) — When true, frontend serves Content-Security-Policy-Report-Only for development
- CSP_REPORT_URI: URL (optional) — Where the browser sends CSP violation reports; defaults to backend /csp-report if unset

### Content Security Policy (CSP)

- Production (strict):
  - default-src 'self'
  - script-src 'self' (add nonces/hashes if inline is needed)
  - style-src 'self'
  - img-src 'self' data:
  - connect-src 'self' wss://your-realtime-host
  - frame-ancestors 'none'
  - report-uri /csp-report (or value of CSP_REPORT_URI)
- Development (report-only recommended):
  - Allows 'unsafe-inline' and 'unsafe-eval' with CSP_REPORT_ONLY=true for DX while still collecting reports

### Raw SQL Policy

- Use prisma.$queryRaw tagged templates with bound variables
- Do not use prisma.$queryRawUnsafe
- Add tests or static checks to prevent regressions (see **tests**/no-unsafe-rawsql.test.ts)

- **Development:** Weak default credentials acceptable (app/app, minio123)
- **Staging:** Strong credentials required, injected via CI/CD
- **Production:** Enterprise-grade credentials, never stored in code

---

## 🛡️ **SECURITY BEST PRACTICES**

### **For Developers**

#### **Environment Setup:**

1. **Copy template:** `cp .env.example .env`
2. **Customize locally:** Update `.env` with your local settings
3. **Never commit:** Environment files are automatically ignored

#### **Credential Management:**

```bash
# ✅ GOOD: Use environment variables
const dbPassword = process.env.POSTGRES_PASSWORD || 'fallback-dev-password';

# ❌ BAD: Hardcoded credentials
const dbPassword = 'my-secret-password';
```

#### **Before Committing:**

```bash
# Check for sensitive files
git status
git diff --cached

# Verify no credentials in code
git grep -i "password.*=" -- "*.ts" "*.js" "*.json"
git grep -i "api.*key\|secret" -- "*.ts" "*.js" "*.json"
```

### **For DevOps/Production**

#### **Environment Injection:**

```bash
# Production deployment
export POSTGRES_PASSWORD="$(generate-secure-password)"
export MINIO_ROOT_PASSWORD="$(generate-secure-password)"
export JWT_SECRET="$(generate-jwt-secret)"

# Container deployment
docker run -e POSTGRES_PASSWORD="$SECURE_PASSWORD" app:latest
```

#### **Secrets Management:**

- **Development:** Local .env files (ignored by git)
- **CI/CD:** GitHub Secrets, GitLab CI Variables
- **Production:** AWS Secrets Manager, Azure Key Vault, HashiCorp Vault

---

## 🔍 **SECURITY AUDIT CHECKLIST**

### **Repository Security:**

- [x] No environment files in git history
- [x] Comprehensive .gitignore patterns
- [x] No hardcoded credentials in source code
- [x] No private keys or certificates committed
- [x] No database dumps or backups in repository

### **Application Security:**

- [x] Environment variables used for all sensitive configuration
- [x] Fallback defaults are weak development credentials only
- [x] No API keys or tokens in source code
- [x] Database connections use environment variables
- [x] File storage credentials use environment variables

### **Infrastructure Security:**

- [x] Docker services use environment variable injection
- [x] Development credentials are weak (acceptable for local dev)
- [ ] Production credentials are strong (pending deployment)
- [ ] SSL/TLS enabled for production (pending deployment)
- [ ] Database encryption at rest (pending production setup)

---

## 🚨 **INCIDENT RESPONSE**

### **If Credentials Are Accidentally Committed:**

1. **Immediate Actions:**

   ```bash
   # Remove from git tracking
   git rm --cached sensitive-file.env

   # Update .gitignore
   echo "sensitive-file.env" >> .gitignore

   # Commit the fix
   git add .gitignore
   git commit -m "SECURITY: Remove sensitive file from tracking"
   ```

2. **Rotate Compromised Credentials:**
   - Change all passwords/keys that were exposed
   - Update production systems immediately
   - Notify team of credential rotation

3. **Clean Git History (if necessary):**
   ```bash
   # For recent commits only
   git filter-branch --force --index-filter \
     'git rm --cached --ignore-unmatch sensitive-file.env' \
     --prune-empty --tag-name-filter cat -- --all
   ```

### **Reporting Security Issues:**

- **Internal:** Create GitHub issue with `security` label
- **External:** Email security@loveconnect.app (when available)
- **Critical:** Immediate team notification via Slack/Discord

---

## 📋 **COMPLIANCE & STANDARDS**

### **Data Protection:**

- **GDPR Compliance:** User data encryption, right to deletion
- **CCPA Compliance:** Data transparency, opt-out mechanisms
- **SOC 2:** Security controls for customer data

### **Security Standards:**

- **OWASP Top 10:** Regular vulnerability assessments
- **ISO 27001:** Information security management
- **PCI DSS:** Payment card data security (if applicable)

### **Regular Security Tasks:**

- **Weekly:** Dependency vulnerability scans
- **Monthly:** Security audit of new code
- **Quarterly:** Penetration testing
- **Annually:** Full security assessment

---

## 🔧 **SECURITY TOOLS & MONITORING**

### **Development Tools:**

- **git-secrets:** Prevent committing secrets
- **truffleHog:** Scan for high entropy strings
- **ESLint Security Plugin:** Static analysis for JavaScript/TypeScript

### **CI/CD Security:**

- **Snyk:** Dependency vulnerability scanning
- **SonarQube:** Code quality and security analysis
- **GitHub Security Advisories:** Automated vulnerability alerts

### **Production Monitoring:**

- **Application logs:** Monitor for suspicious activity
- **Database audit logs:** Track data access patterns
- **API rate limiting:** Prevent abuse and DDoS
- **Intrusion detection:** Monitor for security breaches

---

## 📞 **SECURITY CONTACTS**

- **Security Lead:** TBD
- **DevOps Lead:** TBD
- **Incident Response:** TBD
- **External Security Consultant:** TBD

---

**Remember:** Security is everyone's responsibility. When in doubt, ask the team or err on the side of caution.

**Status:** ✅ Repository secured, ready for team collaboration
